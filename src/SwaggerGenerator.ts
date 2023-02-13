import {Application} from 'express';
import * as PJSON from 'pjson';
import * as swaggerUi from 'swagger-ui-express';
import {ArrayTypeDescriptor, JsonObjectMetadata} from 'typedjson';
import {IControllerDocumentation, IMountedRoute} from './interfaces';
import clone from 'clone'
import basicAuth from 'express-basic-auth'

const swaggerTemplate = require('../swagger.js');

swaggerTemplate.info.version = PJSON.version;

export function SwaggerDoc(docs: IControllerDocumentation): ClassDecorator {
    return function(target: any) {
        target.SWAGGER_DOC = docs;
        return target;
    }
}


export class SwaggerGenerator {
    constructor(
      public userName: string,
      public password: string,
      public title: string = 'API Documentation',
      public description: string = 'This was automatically generated using the swagger-generator-util. Please see the README on how to setup your own title and description',
    ) {}

    public build(app: Application, mountPoint: string, routeGroups: Array<Array<IMountedRoute>>) {
        const swaggerSpec = clone(swaggerTemplate);
        swaggerSpec.info.title += ' ' + mountPoint;

        swaggerSpec.servers.push({
            url: mountPoint.replace('/swagger','')
        });
        const tags: any = {};
        const routes: Array<IMountedRoute> = routeGroups.flat();

        const sorted = routes.sort((a,b) => a.path.localeCompare(b.path));
        sorted.forEach(route => {
            const parts = route.path.split('/');
            const tag = parts[1];
            if (!tags[tag]) {
                tags[tag] = tag;
            }
            swaggerSpec.paths[route.path] = swaggerSpec.paths[route.path] || {};

            let parameters: any = undefined;
            let requestBody: any = undefined;
            let responses: any = undefined;

            const providedMetadata: IControllerDocumentation = ((route.controller || {}) as any).SWAGGER_DOC || {};
            if (Object.keys(providedMetadata).length !== 0) {
                if (providedMetadata.query) {
                    parameters = [];
                    const metadata = JsonObjectMetadata.getFromConstructor(providedMetadata.query as any);
                    if (metadata) {
                        metadata.dataMembers.forEach(member => {
                            parameters.push({
                                in: 'query',
                                name: member.name,
                                schema: {
                                    type: member.type ? member.type().ctor.name : ''
                                },
                                required: !!member.isRequired
                            })
                        })
                    }
                }
                if (providedMetadata.body) {
                    requestBody = {
                        content: {
                            'application/json': {
                                schema: buildSchema(swaggerSpec, providedMetadata.body, 0),
                                required: true
                            }
                        }
                    };
                }
                if (providedMetadata.response) {
                    responses = {
                        '200': {
                            content: {
                                'application/json': {
                                    schema: buildSchema(swaggerSpec, providedMetadata.response, 0)
                                }
                            }
                        }
                    }
                }
            }

            swaggerSpec.paths[route.path][route.verb] = {
                tags: [tag],
                // summary: `${route.verb} ${route.route}`
                summary: providedMetadata.summary,
                description: providedMetadata.description,
                requestBody,
                parameters,
                responses,
                security: [{
                    XAuthToken: []
                }]
            };
        });

        Object.keys(tags).forEach(tag => {
            swaggerSpec.tags.push({
                name: tag,
            });
        });


        const options = {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'API Docs',
            customfavIcon: '/favicon.png'
        };

        // Object.keys(tags).forEach(tag => {
        //   console.log('');
        //   console.log('Swagger group: ' + tag);
        //   console.log('');
        //   Object.keys(swaggerSpec.paths).forEach(route => {
        //     Object.keys(swaggerSpec.paths[route]).forEach(verb => {
        //       // console.log(tag, swaggerSpec.paths[route][verb].tags);
        //       if (swaggerSpec.paths[route][verb].tags.indexOf(tag) !== -1) {
        //         console.log(verb + ' ' + route);
        //       }
        //     });
        //   });
        // });

        // console.log('mountPoint: ' + mountPoint + '/' + versionTag);

        app.use(mountPoint + '/swagger.json', (req, res) => {
            res.json(swaggerSpec)
        })
        app.use(mountPoint, basicAuth({
            challenge: true,
            users: { [this.userName]: this.password }
        }));

        app.use(mountPoint, swaggerUi.serveFiles(swaggerSpec, options), swaggerUi.setup(swaggerSpec, options));

    }
}

function ensureSchema(swaggerSpec: any, ctor: any, depth: number) {
    if (!swaggerSpec.components.schemas) {
        swaggerSpec.components.schemas = {};
    }
    if (!swaggerSpec.components.schemas[ctor.name]) {
        swaggerSpec.components.schemas[ctor.name] = buildSchema(swaggerSpec, ctor, depth + 1)
        // console.log('Registered schema for ', ctor.name);
    } else {
        // console.log('Schema for ', ctor.name, 'already registered');
    }
}

function buildSchema(swaggerSpec: any, dto: any, depth: number) {
    if (!dto) {
        return undefined;
    }

    const sourceTypeMetadata = JsonObjectMetadata.getFromConstructor(dto);

    if (!sourceTypeMetadata) {
        return undefined;
    }
    // console.log(sourceTypeMetadata);
    // console.log(Reflect.getMetadata('design:type', dto));
    let schema: any = {
        type: 'object',
        properties: {}
    };
    // const properties: {[key: string]: any} = {};
    sourceTypeMetadata.dataMembers.forEach(member => {
        if (!member.type) {
            return;
        }
        // console.log('type: ', member.type().ctor.name);

        const mType = member.type();
        if (mType.ctor === String || mType.ctor === Number || mType.ctor === Boolean) {
            schema.properties[member.name] = {
                type: mType.ctor.name.toLowerCase()
            };
        } else if (mType.ctor === Date) {
            schema.properties[member.name] = {
                type: 'string',
                format: 'date'
            }
        } else if (mType.ctor === Array) {
            const arrayTypeCtor = (mType as ArrayTypeDescriptor).elementType.ctor;
            // console.log('parsing array type: ', arrayTypeCtor);
            const arrayTypeMetadata = JsonObjectMetadata.getFromConstructor(arrayTypeCtor);
            if (arrayTypeMetadata) {
                if (depth < 10) {
                    ensureSchema(swaggerSpec, arrayTypeCtor, depth);
                }
                schema.properties[member.name] = {
                    type: 'array',
                    items: {
                        '$ref': '#/components/schemas/' + arrayTypeCtor.name
                    }
                };
            } else {
                schema.properties[member.name] = {
                    type: 'array',
                    items: {
                        type: (mType as ArrayTypeDescriptor).elementType.ctor.name.toLowerCase()
                    }
                }
            }
        } else {
            // console.log('Warning, unhandled annotation type: ', mType.ctor.name);

            // check if we have metadata for this type

            const mTypeMetadata = JsonObjectMetadata.getFromConstructor(mType.ctor);

            if (mTypeMetadata) {

                // console.log('found metadata: ', mTypeMetadata);

                ensureSchema(swaggerSpec, mType.ctor, depth);

                schema.properties[member.name] = {
                    '$ref': '#/components/schemas/' + mType.ctor.name
                };
            } else {
                console.log('Warning, swagger failed to get type info for property: ', member.name);
                schema.properties[member.name] = {
                    type: mType.ctor.name.toLowerCase()
                };
            }
        }


    });
    return schema;
}
