require('dotenv').config();
const logger = require('./utils/logger');

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const server = require('./server');

class Application {
    constructor() {
        this.httpServer = null;
        this.httpsServer = null;
    }

    loadTLSCredentials() {
        const enableTls = process.env.ENABLE_TLS !== 'false';
        const tlsConfigDir = process.env.TLS_CONFIG_DIR || '/tls';

        if (!enableTls) {
            logger.sys('TLS disabled');
            return null;
        }

        try {
            const privateKey = fs.readFileSync(
                path.resolve(__dirname, `${tlsConfigDir}/tls.key`),
                'utf8'
            );

            const certificate = fs.readFileSync(
                path.resolve(__dirname, `${tlsConfigDir}/tls.crt`),
                'utf8'
            );

            logger.sys('TLS credentials loaded successfully');
            return { key: privateKey, cert: certificate };
        } catch (error) {
            logger.error('Failed to load TLS credentials', 'ОшибкаTLS', error);
            return null;
        }
    }

    setupGracefulShutdown() {
        const gracefulShutdown = (signal) => {
            logger.sys(`Received ${signal}, shutting down gracefully...`);

            const shutdownPromises = [];

            if (this.httpServer) {
                shutdownPromises.push(new Promise(resolve => {
                    this.httpServer.close(() => {
                        logger.sys('HTTP server closed');
                        resolve();
                    });
                }));
            }

            if (this.httpsServer) {
                shutdownPromises.push(new Promise(resolve => {
                    this.httpsServer.close(() => {
                        logger.sys('HTTPS server closed');
                        resolve();
                    });
                }));
            }

            Promise.all(shutdownPromises)
                .then(() => {
                    logger.sys('All servers closed, exiting');
                    process.exit(0);
                })
                .catch((error) => {
                    logger.error('Error during shutdown', 'ОшибкаЗавершения', error);
                    process.exit(1);
                });

            setTimeout(() => {
                logger.error('Forced shutdown after timeout', 'ПринудительноеЗавершение');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }

    async start() {
        try {
            logger.sys('Starting application...');

            const app = await server();
            const credentials = this.loadTLSCredentials();
            const port = parseInt(process.env.PORT || '4000', 10);

            // HTTP server
            this.httpServer = http.createServer(app);
            this.httpServer.listen(port, () => {
                logger.sys(`HTTP server ready on port ${port}`);
                logger.sys(`Health endpoint: http://localhost:${port}/health`);
                logger.sys(`API endpoint: http://localhost:${port}/api`);
            });

            // HTTPS server
            if (credentials) {
                this.httpsServer = https.createServer(credentials, app);
                this.httpsServer.listen(4443, () => {
                    logger.sys(`HTTPS server ready on port 4443`);
                    logger.sys(`Health endpoint: https://localhost:4443/health`);
                    logger.sys(`API endpoint: https://localhost:4443/api`);
                });
            }

            this.setupGracefulShutdown();

            logger.sys('Application started successfully');

        } catch (error) {
            logger.error('Failed to start application', 'ОшибкаЗапуска', error);
            process.exit(1);
        }
    }
}

// Запуск приложения
const application = new Application();
application.start();