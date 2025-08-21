require('dotenv').config()
require('./utils/logger')

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const server = require('./server')

const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

console.siem = (message) => {
    originalConsole.log(message);
};

console.sys = (message, additionalData = {}) => {
    const timestamp = new Date();
    const logData = {
        "@timestamp": timestamp.getTime() / 1000,
        "level": "info",
        "eventId": uuidv4(),
        "text": typeof message === 'string' ? message : JSON.stringify(message),
        "localTime": timestamp.toISOString(),
        "PID": process.pid,
        "appType": "NODEJS",
        "projectCode": "SUM",
        "appName": "sum-backend",
        "timestamp": timestamp.toISOString(),
        "envType": process.env.NODE_ENV === 'production' ? 'K8S' : 'DEV',
        "namespace": process.env.NAMESPACE || 'local-dev',
        "podName": os.hostname(),
        "tec": {
            "nodeName": os.hostname(),
            "podIp": getLocalIP() || '127.0.0.1'
        },
        "tslgClientVersion": "1.0.0",
        "eventOutcome": "Системное",
        ...additionalData
    };

    console.siem(JSON.stringify(logData));
};

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
                return address.address;
            }
        }
    }
    return null;
}

const enableTls = process.env.ENABLE_TLS || true
const tlsConfigDir = process.env.TLS_CONFIG_DIR || '/tls'

const credentials = {}

if ( enableTls && enableTls.toString() === "true") {
    const privateKey  = fs.readFileSync(
        path.resolve( __dirname, `${tlsConfigDir}/tls.key`), 
        'utf8'
    )

    const certificate = fs.readFileSync(
        path.resolve( __dirname, `${tlsConfigDir}/tls.crt`), 
        'utf8'
    )
    
    credentials.key = privateKey
    credentials.cert = certificate
}

const port = process.env.PORT || 4000

const start = async () => {
    const app = await server()

    const httpServer = http.createServer(app);
    const httpsServer = https.createServer(credentials, app);

    httpServer.listen(
        port,
        () => {
            console.sys(`REST API server ready at http://localhost:4000/api`)
            console.sys(`Health enpoint ready at http://localhost:4000/health`)
        }
    )

    httpsServer.listen(
        4443,
        () => {
            console.sys(`REST API server ready at https://localhost:4443/api`)
            console.sys(`Health enpoint ready at http://localhost:4443/health`)
        }
    )
}

start()
