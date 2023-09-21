const swaggerAutogen = require('swagger-autogen')()

const outputFile = './swagger_output.json'
const routesFiles = ['./src/data.capture.api/data.capture.routes.js', './src/data.capture.api/scan.job.routes.js']

swaggerAutogen(outputFile, routesFiles)
