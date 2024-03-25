const { 
    Client, 
    logger,
    BasicAuthInterceptor 
} = require("camunda-external-task-client-js");

const basicAuthentication = new BasicAuthInterceptor({
    username: process.env.BPMN_USER || 'demo',
    password: process.env.BPMN_PWD || 'demo'
})

const clientConfig = {
    baseUrl: process.env.BPMN_API || 'http://localhost:8085/engine-rest', 
    interceptors: basicAuthentication,
    use: logger 
}


module.exports = new Client(clientConfig)