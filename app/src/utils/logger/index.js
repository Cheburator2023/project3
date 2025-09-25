const LoggerFactory = require('./LoggerFactory');
const ConsoleOverride = require('./ConsoleOverride');

const logger = LoggerFactory.createLogger({
    appName: process.env.APP_NAME || 'sum-backend',
    projectCode: process.env.PROJECT_CODE || 'SUMD',
    risCode: process.env.RIS_CODE || '1661'
});

const consoleOverride = new ConsoleOverride(logger);
consoleOverride.apply();

const setupGracefulShutdown = () => {
    const shutdown = (signal) => {
        logger.sys(`Received ${signal}, shutting down gracefully...`);

        setTimeout(() => {
            logger.close();
            consoleOverride.restore();
            process.exit(0);
        }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

setupGracefulShutdown();

module.exports = logger;