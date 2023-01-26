# Hypercolor Swagger Generator

## Table of Contents
  - [Introduction](#introduction)
  - [Installation](#installation)
  - [Prerequisites](#prerequisites)
    - [Required Architecture](#compatible-api-routing-architecture-overview)
  - [Examples](#examples)
    - [Example Files](#example-files-)
      - [Example Root File](swagger.js)
    - [Types and Interfaces](#types-and-interfaces-)
  - [License](LICENSE)
  - [More Information](#more-information)
    - [Toolchain](#toolchain)
    - [Project Repository](#project-repository)
    - [Organization Repository](#organization-repository)

## Introduction
This is a simple add-on for swagger-UI-Express that allows for programmatic generation of API documentation.  


## Installation
  - NPM 
    - `npm install hc-swagg-util`
  - Yarn 
    - `yarn add hc-swagg-util`


## Prerequisites
  - npm / yarn
  - Node.js 
  - Express.js
  - swagger.js file in the root of your project (*see swagger.js example template file below*)
```javascript
module.exports = {
  openapi: "3.0.2",
  info: {
    title: '', //change_me
    description: '', //change_me

    version: "---"
  },
  servers: [],
  tags: [],
  paths: {},
  components: {
    securitySchemes: {
      ...
      // custom token validation descriptions here
    }
  }

}
```
#### *Compatible API Routing Architecture Overview*
- In order for the programmatic parsing of API routes and their associated documentation, routes need to be mounted into a specific format. Please visit the [example](#examples) section for more information and code examples.


## Examples
### Example Files:
Router Construction
```typescript
export class ExpressRouter {
  constructor(private readonly options?: IRouterOptions) {
    this.options = options || {};
  }
  private formattedRoutes: Array<ExpressRoute> = [];
  public router: Router = Router();

  public get routes(): Array<IMountedRoute> {
    return this.formattedRoutes.map(formattedRoute => {
      return {
        path: formattedRoute.routePrefix,
        verb: formattedRoute.verb,
        controller: formattedRoute.controller
      };
    });
  }

  public static build(options: IRouterOptions, builder: (router: ExpressRouter) => void) {
    const router = new ExpressRouter(options);
    builder(router);
    return router;
  }

  public route(route: string) {
    const typedRoute = new ExpressRoute(route, this.router, this.options!);
    this.formattedRoutes.push(typedRoute);
    return typedRoute;
  }
}
```

Route Construction
```typescript

export class ExpressRoute {
  constructor(public routePrefix: string, router: Router, private opts: IRouterOptions) {
    this.route = router.route(routePrefix);
  }
  public verb = 'unknown';
  public controller?: IControllerType;

  private route: IRoute;
  private myMiddleware: Array<RequestHandler> = [];


  public use(middleware: RequestHandler) {
    this.myMiddleware.push(middleware);
    return this;
  }
}
```
API Route Mounting File
```typescript
export class V1ApiRoutes {
  public static buildAndMountRoutes(expressApp: e.Application, mountPoint: string) {
    const routers = [
      ExpressRouter.build({
        
      }, router => {
        router.route('hello').get(GetHelloController);
        router.route('welcome').get(GetWelcomeController);
      })
    ];
    
    routers.forEach(router => expressApp.use(mountPoint, router.router));
    
    return routers;
  }
}
```
Routes File
- Import `hc-swag-util` inside of wherever your routes are mounted at, and call the utility. 
  - Be sure to give valid arguments for:
    - username
    - password
    - title
    - description

```typescript
export class ApiRoutes {
  public static register(app: e.Application) {
    const v1ApiRoutes: Array<ExpressRouter> = V1ApiRoutes.buildAndMountRoutes(app, '/api/v1');

    SwaggerGenerator(
      "test_user",
      "change_me",
      "Title Here",
      "Create a useful description here",
    ).build(
      app,
      "/swagger/api/v1",
      v1ApiRoutes
    );
  }
}

```
Controller File
- Use the SwaggerDoc function as an annotation to assign the various expected formats for the specific API. The HC Swagg Util will use those during the compilation process. 

```typescript
@SwaggerDoc({
  description: '', //description of API
  body: {}, //Expected request body format,
  query: {}, //Expected request query format,
  params: {}, //Expected request params format
  response: {} //Expected response format 
})
export class ExampleController extends Controller {
  // controller logic here...
}

export abstract class Controller {
  constructor(protected request: Request, protected response: Response) {};
}
```

### Types and Interfaces:
```typescript
export type IControllerType = new (req: Request, res: Response, next: NextFunction) => Controller;
```
```typescript
export interface IControllerDocumentation {
  summary?: string
  description?: string
  body?: {[key: string]: any}
  query?: {[key: string]: any}
  response?: {[key: string]: any}
}
```
```typescript
export interface IRouterItem {
  path: string,
  verb: string,
  controller: IControllerType | undefined
}
```
```typescript
export interface IRouter {
  routes: Array<IRouterItem>
}
```
```typescript
export interface IMountedRoute {
  path: string,
  verb: string,
  controller: IControllerType | undefined
}

```

## More Information
#### Toolchain
- Node.js
- TypeScript
- Express.js
- Swagger.js
- typedjson

#### [Project Repository](https://github.com/hypercolor/swagger-generator)

#### [Organization Repository](https://github.com/hypercolor/)
