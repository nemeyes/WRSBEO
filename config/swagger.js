const rootPath = require('app-root-path');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: "3.0.0",
    info : { // 정보 s작성
        title : "WRS-Backoffice API",
        version : "1.0.0",
        description : "WRS-Backoffice API DOCs",
        contact: {
            name: "Jay Kim",
            email: "dopejk@gmail.com"
        },
    },
    basePath : "/api-docs", // base path
    // servers: [
    //     {
    //         url: "http://localhost:3030",
    //         description: "Local Server"
    //     },
    //     {
    //         url: "http://13.52.139.79:3030",
    //         description: "Dev Server"
    //     },
    //     // {
    //     //     url: "http://localhost:3002",
    //     //     description: "Prod Server"
    //     // }
    // ],
    // components: {
    //     securitySchemes: {
    //         ApiKeyAuth: {
    //             type: 'apiKey',
    //             in: 'header',
    //             name: 'access_token',
    //         }
    //     },
    // }
};

const options = {
    swaggerDefinition: swaggerDefinition,
    apis : [`${rootPath}/routes/*.js`, `${rootPath}/models/swagger/*`]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;