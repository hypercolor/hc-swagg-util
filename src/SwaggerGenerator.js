"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwaggerGenerator = exports.SwaggerDoc = void 0;
const PJSON = __importStar(require("pjson"));
const swaggerUi = __importStar(require("swagger-ui-express"));
const typedjson_1 = require("typedjson");
const swaggerTemplate = require('../../../../swagger');
const clone = require('clone');
const basicAuth = require('express-basic-auth');
swaggerTemplate.info.version = PJSON.version;
function SwaggerDoc(docs) {
    return function (target) {
        target.SWAGGER_DOC = docs;
        return target;
    };
}
exports.SwaggerDoc = SwaggerDoc;
class SwaggerGenerator {
    constructor(userName, password, title = 'API Documentation', description = 'This was automatically generated using the swagger-generator-util. Please see the README on how to setup your own title and description') {
        this.userName = userName;
        this.password = password;
        this.title = title;
        this.description = description;
    }
    build(app, mountPoint, routers) {
        const swaggerSpec = clone(swaggerTemplate);
        swaggerSpec.info.title += ' ' + mountPoint;
        swaggerSpec.servers.push({
            url: mountPoint.replace('/swagger', '')
        });
        const tags = {};
        const routes = [];
        routers.forEach(router => {
            const routerRoutes = router.routes;
            routerRoutes.forEach(mountedRoute => {
                routes.push(mountedRoute);
            });
        });
        const sorted = routes.sort((a, b) => a.path.localeCompare(b.path));
        sorted.forEach(route => {
            const parts = route.path.split('/');
            const tag = parts[1];
            if (!tags[tag]) {
                tags[tag] = tag;
            }
            swaggerSpec.paths[route.path] = swaggerSpec.paths[route.path] || {};
            let parameters = undefined;
            let requestBody = undefined;
            let responses = undefined;
            const providedMetadata = (route.controller || {}).SWAGGER_DOC || {};
            if (Object.keys(providedMetadata).length !== 0) {
                if (providedMetadata.query) {
                    parameters = [];
                    const metadata = typedjson_1.JsonObjectMetadata.getFromConstructor(providedMetadata.query);
                    if (metadata) {
                        metadata.dataMembers.forEach(member => {
                            parameters.push({
                                in: 'query',
                                name: member.name,
                                schema: {
                                    type: member.type ? member.type().ctor.name : ''
                                },
                                required: !!member.isRequired
                            });
                        });
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
                    };
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
            res.json(swaggerSpec);
        });
        app.use(mountPoint, basicAuth({
            challenge: true,
            users: { [this.userName]: this.password }
        }));
        app.use(mountPoint, swaggerUi.serveFiles(swaggerSpec, options), swaggerUi.setup(swaggerSpec, options));
    }
}
exports.SwaggerGenerator = SwaggerGenerator;
function ensureSchema(swaggerSpec, ctor, depth) {
    if (!swaggerSpec.components.schemas) {
        swaggerSpec.components.schemas = {};
    }
    if (!swaggerSpec.components.schemas[ctor.name]) {
        swaggerSpec.components.schemas[ctor.name] = buildSchema(swaggerSpec, ctor, depth + 1);
        // console.log('Registered schema for ', ctor.name);
    }
    else {
        // console.log('Schema for ', ctor.name, 'already registered');
    }
}
function buildSchema(swaggerSpec, dto, depth) {
    if (!dto) {
        return undefined;
    }
    const sourceTypeMetadata = typedjson_1.JsonObjectMetadata.getFromConstructor(dto);
    if (!sourceTypeMetadata) {
        return undefined;
    }
    // console.log(sourceTypeMetadata);
    // console.log(Reflect.getMetadata('design:type', dto));
    let schema = {
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
        }
        else if (mType.ctor === Date) {
            schema.properties[member.name] = {
                type: 'string',
                format: 'date'
            };
        }
        else if (mType.ctor === Array) {
            const arrayTypeCtor = mType.elementType.ctor;
            // console.log('parsing array type: ', arrayTypeCtor);
            const arrayTypeMetadata = typedjson_1.JsonObjectMetadata.getFromConstructor(arrayTypeCtor);
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
            }
            else {
                schema.properties[member.name] = {
                    type: 'array',
                    items: {
                        type: mType.elementType.ctor.name.toLowerCase()
                    }
                };
            }
        }
        else {
            // console.log('Warning, unhandled annotation type: ', mType.ctor.name);
            // check if we have metadata for this type
            const mTypeMetadata = typedjson_1.JsonObjectMetadata.getFromConstructor(mType.ctor);
            if (mTypeMetadata) {
                // console.log('found metadata: ', mTypeMetadata);
                ensureSchema(swaggerSpec, mType.ctor, depth);
                schema.properties[member.name] = {
                    '$ref': '#/components/schemas/' + mType.ctor.name
                };
            }
            else {
                console.log('Warning, swagger failed to get type info for property: ', member.name);
                schema.properties[member.name] = {
                    type: mType.ctor.name.toLowerCase()
                };
            }
        }
    });
    return schema;
}
//# sourceMappingURL=SwaggerGenerator.js.map