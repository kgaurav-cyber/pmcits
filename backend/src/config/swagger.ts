import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Police Medical Claims Intelligence & Transparency System (PMCITS) API',
      version: '1.0.0',
      description: 'REST API documentation for the PMCITS platform, managing claims workflows, user profiles, AI audits, and payment records.'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/auth/*.ts', './src/notifications/*.ts', './src/reports/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
