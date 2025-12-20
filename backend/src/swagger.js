import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
    servers: [{ url: "http://localhost:3001" }],
  },
  apis: ["././src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;