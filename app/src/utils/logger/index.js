const LoggerFactory = require('./LoggerFactory');
const ConsoleOverride = require('./ConsoleOverride');

const defaultConfig = {
    appName: process.env.APP_NAME || 'sum-backend',
    projectCode: process.env.PROJECT_CODE || 'SUMD',
    risCode: process.env.RIS_CODE || '1661',
    host: process.env.TSLG_AGENT_HOST || 'tslg-agent-svc-main',
    port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10)
};

const logger = LoggerFactory.createLogger(defaultConfig);

const consoleOverride = new ConsoleOverride(logger);

setTimeout(() => {
    consoleOverride.apply();
    console.sys('Logger initialization completed');
}, 100);

const setupGracefulShutdown = () => {
    const shutdown = (signal) => {
        console.original.log(`Received ${signal}, shutting down gracefully...`);

        setTimeout(() => {
            logger.close();
            consoleOverride.restore();
            process.exit(0);
        }, 3000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

setupGracefulShutdown();

module.exports = logger;