// src/swagger.ts
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
        bearerAuth: [], // Aplica globalmente a todas as rotas
      },
    ],
  },
  // Aponte para os arquivos que contêm as anotações JSDoc
  apis: ['src/**/*.ts'], // se rodar o build e servir de /dist, mude para 'dist/**/*.js'
};

export const swaggerSpec = swaggerJSDoc(options);
