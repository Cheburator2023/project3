// Test 1
require('dotenv').config()
require('./utils/logger')

const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const server = require('./server')

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
