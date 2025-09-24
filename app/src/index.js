require('dotenv').config();
require('./utils/logger');

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const tslgLogger = require('./utils/logger');

const server = require('./server');

const enableTls = process.env.ENABLE_TLS || true;
const tlsConfigDir = process.env.TLS_CONFIG_DIR || '/tls';

const credentials = {};

if (enableTls && enableTls.toString() === "true") {
    const privateKey = fs.readFileSync(
        path.resolve(__dirname, `${tlsConfigDir}/tls.key`),
        'utf8'
    );

    const certificate = fs.readFileSync(
        path.resolve(__dirname, `${tlsConfigDir}/tls.crt`),
        'utf8'
    );

    credentials.key = privateKey;
    credentials.cert = certificate;
}

const port = process.env.PORT || 4000;

const start = async () => {
    try {
        const app = await server();

        const httpServer = http.createServer(app);
        const httpsServer = https.createServer(credentials, app);

        httpServer.listen(port, () => {
            tslgLogger.sys(`REST API server ready at http://localhost:${port}/api`);
            tslgLogger.sys(`Health endpoint ready at http://localhost:${port}/health`);
        });

        httpsServer.listen(4443, () => {
            tslgLogger.sys(`REST API server ready at https://localhost:4443/api`);
            tslgLogger.sys(`Health endpoint ready at https://localhost:4443/health`);
        });

        const gracefulShutdown = () => {
            tslgLogger.sys('Shutting down gracefully...');
            tslgLogger.close();

            httpServer.close(() => {
                process.exit(0);
            });

            setTimeout(() => {
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        tslgLogger.error('Failed to start server', 'ОшибкаЗапуска', error);
        process.exit(1);
    }
};

start();