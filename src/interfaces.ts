
export interface IControllerDocumentation {
  summary?: string
  description?: string
  body?: {[key: string]: any}
  query?: {[key: string]: any}
  response?: {[key: string]: any}
}

export interface IMountedRoute {
  path: string,
  verb: string,
  controller: any
}
