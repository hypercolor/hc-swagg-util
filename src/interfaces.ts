import {NextFunction} from 'express';

export type IControllerType = new (req: Request, res: Response, next: NextFunction) => any;

export interface IControllerDocumentation {
  summary?: string
  description?: string
  body?: {[key: string]: any}
  query?: {[key: string]: any}
  response?: {[key: string]: any}
}

export interface IRouterItem {
  path: string,
  verb: string,
  controller: IControllerType | undefined
}

export interface IRouter {
  routes: Array<IRouterItem>
}

export interface IMountedRoute {
  path: string,
  verb: string,
  controller: IControllerType | undefined
}
