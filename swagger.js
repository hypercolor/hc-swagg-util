
import {SwaggerGenerator} from "./index";

module.exports = {
  openapi: "3.0.2",
  info: {
    title: `${SwaggerGenerator.prototype.title}`,
    description: `${SwaggerGenerator.prototype.description}`,

    version: "---"
  },
  servers: [],
  tags: [],
  paths: {},
  components: {
    securitySchemes: {
      XAuthToken: {
        type: "apiKey",
        name: "X-Auth-Token",
        in: "header"
      }
    }
  }

}
