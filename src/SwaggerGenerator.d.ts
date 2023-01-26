import { Application } from 'express';
import { IControllerDocumentation, IRouter } from './interfaces';
export declare function SwaggerDoc(docs: IControllerDocumentation): ClassDecorator;
export declare class SwaggerGenerator {
    userName: string;
    password: string;
    title: string;
    description: string;
    constructor(userName: string, password: string, title?: string, description?: string);
    build(app: Application, mountPoint: string, routers: Array<IRouter>): void;
}
