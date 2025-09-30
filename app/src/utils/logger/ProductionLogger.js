const LoggerInterface = require('./LoggerInterface');

/**
 * Универсальный production логгер
 */
class ProductionLogger extends LoggerInterface {
    constructor(config = {}) {
        super();
        this.config = config;
        this.currentLogger = null;
        this.loggerType = 'console';
        this.initialized = false;

        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        this.initialize();
    }

    initialize() {
        try {
            const ConsoleLogger = require('./ConsoleLogger');
            this.currentLogger = new ConsoleLogger(this.config);
            this.loggerType = 'console';
            this.initialized = true;

            this.trySwitchToTSLG();
        } catch (error) {
            this.originalConsole.error('Failed to initialize ProductionLogger:', error.message);
            this.initialized = false;
        }
    }

    async trySwitchToTSLG() {
        try {
            const TSLGConnectionTester = require('./TSLGConnectionTester');
            const tester = new TSLGConnectionTester({
                host: this.config.host,
                port: this.config.port
            });

            const isAvailable = await tester.isTSLGAvailable();

            if (isAvailable) {
                const TSLGLogger = require('./tslgLogger');
                const tslgLogger = new TSLGLogger(this.config);

                if (this.currentLogger && this.currentLogger.close) {
                    this.currentLogger.close();
                }
                this.currentLogger = tslgLogger;
                this.loggerType = 'tslg';

                this.originalConsole.log(`Successfully switched to TSLG logger. Connected to ${this.config.host}:${this.config.port}`);
            }
        } catch (error) {
            this.originalConsole.error('Failed to switch to TSLG logger:', error.message);
        }
    }

    log(level, message, event = 'Информация', error = null, additionalData = {}) {
        if (!this.initialized || !this.currentLogger) {
            this.fallbackLog(level, message, event, error, additionalData);
            return;
        }

        try {
            this.currentLogger.log(level, message, event, error, additionalData);
        } catch (logError) {
            this.originalConsole.error('Error in logger:', logError.message);
            this.fallbackLog(level, message, event, error, additionalData);
        }
    }

    fallbackLog(level, message, event, error, additionalData) {
        const timestamp = new Date().toISOString();
        const logMessage = `[FALLBACK] [${timestamp}] [${level.toUpperCase()}] [${event}] ${message}`;

        if (error) {
            this.originalConsole.error(logMessage, error);
        } else {
            this.originalConsole.log(logMessage);
        }
    }

    info(message, event = 'Информация', additionalData = {}) {
        this.log('info', message, event, null, additionalData);
    }

    warn(message, event = 'Предупреждение', additionalData = {}) {
        this.log('warn', message, event, null, additionalData);
    }

    error(message, event = 'Ошибка', error = null, additionalData = {}) {
        this.log('error', message, event, error, additionalData);
    }

    sys(message, additionalData = {}) {
        this.log('info', message, 'Системное', null, additionalData);
    }

    close() {
        if (this.currentLogger && this.currentLogger.close) {
            try {
                this.currentLogger.close();
            } catch (error) {
                this.originalConsole.error('Error closing logger:', error.message);
            }
        }
        this.initialized = false;
    }

    getStatus() {
        if (!this.initialized) {
            return {
                type: 'ProductionLogger',
                initialized: false,
                status: 'uninitialized'
            };
        }

        const baseStatus = {
            type: 'ProductionLogger',
            initialized: true,
            loggerType: this.loggerType,
            currentLogger: this.currentLogger ? this.currentLogger.constructor.name : 'none'
        };

        if (this.currentLogger && this.currentLogger.getStatus) {
            try {
                const loggerStatus = this.currentLogger.getStatus();
                return { ...baseStatus, ...loggerStatus };
            } catch (error) {
                return { ...baseStatus, statusError: error.message };
            }
        }

        return baseStatus;
    }
}

module.exports = ProductionLogger;