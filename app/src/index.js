require('dotenv').config();
const logger = require('./utils/logger');
const { startAuditGenerator } = require('./utils/audit/auditGenerator');

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const server = require('./server');

class Application {
  constructor() {
    this.httpServer = null;
    this.httpsServer = null;
    this.runtime = null;
    this.isShuttingDown = false;
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
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) return
      this.isShuttingDown = true

      logger.sys(`Received ${signal}, shutting down gracefully...`);

      const forceExitTimer = setTimeout(() => {
        logger.error('Forced shutdown after timeout', 'ПринудительноеЗавершение');
        process.exit(1);
      }, 10000);

      try {
        await this.closeServer(this.httpServer, 'HTTP')
        await this.closeServer(this.httpsServer, 'HTTPS')

        if (this.runtime?.stop) {
          await this.runtime.stop()
          logger.sys('Application runtime stopped')
        }

        clearTimeout(forceExitTimer)
        logger.sys('All servers closed, exiting')
        process.exit(0);
      } catch (error) {
        clearTimeout(forceExitTimer)
        logger.error('Error during shutdown', 'ОшибкаЗавершения', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => {
      gracefulShutdown('SIGTERM').catch((error) => {
        logger.error('Unhandled shutdown error', 'ОшибкаЗавершения', error)
        process.exit(1)
      })
    });
    process.on('SIGINT', () => {
      gracefulShutdown('SIGINT').catch((error) => {
        logger.error('Unhandled shutdown error', 'ОшибкаЗавершения', error)
        process.exit(1)
      })
    });
  }

  async closeServer(server, label) {
    if (!server) return

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        logger.sys(`${label} server closed`);
        resolve();
      });
    })
  }

  async start() {
    try {
      logger.sys('Starting application...');

      this.runtime = await server();
      const credentials = this.loadTLSCredentials();
      const port = parseInt(process.env.PORT || '4000', 10);

      this.httpServer = http.createServer(this.runtime.app);
      this.httpServer.listen(port, () => {
        logger.sys(`HTTP server ready on port ${port}`);
        logger.sys(`Health endpoint: http://localhost:${port}/health`);
        logger.sys(`API endpoint: http://localhost:${port}/api`);
      });

      if (credentials) {
        this.httpsServer = https.createServer(credentials, this.runtime.app);
        this.httpsServer.listen(4443, () => {
          logger.sys('HTTPS server ready on port 4443');
          logger.sys('Health endpoint: https://localhost:4443/health');
          logger.sys('API endpoint: https://localhost:4443/api');
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

const application = new Application();
application.start();
if (process.env.AUDIT_GENERATOR_ENABLED !== 'false') {
  startAuditGenerator(parseInt(process.env.AUDIT_GENERATOR_INTERVAL_MS) || 1000);
}
