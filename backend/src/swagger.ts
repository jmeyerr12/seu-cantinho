import swaggerJSDoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Seu Cantinho API',
      version: '1.0.0',
      description: 'Documentação da API com Swagger (OpenAPI 3.1)',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local' },
      
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['src/**/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
