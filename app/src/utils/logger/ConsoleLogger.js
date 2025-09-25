const LoggerInterface = require('./LoggerInterface');

/**
 * Консольный логгер для разработки
 */
class ConsoleLogger extends LoggerInterface {
    constructor(config = {}) {
        super();
        this.config = config;
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
    }

    formatMessage(level, message, event, error, additionalData) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase();

        let logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${message}`;

        if (error) {
            logMessage += ` | Error: ${error.message}`;
        }

        if (Object.keys(additionalData).length > 0) {
            logMessage += ` | Data: ${JSON.stringify(additionalData)}`;
        }

        return logMessage;
    }

    log(level, message, event = 'Информация', error = null, additionalData = {}) {
        const formattedMessage = this.formatMessage(level, message, event, error, additionalData);

        switch (level) {
            case 'error':
                this.originalConsole.error(formattedMessage);
                if (error && error.stack) {
                    this.originalConsole.error(error.stack);
                }
                break;
            case 'warn':
                this.originalConsole.warn(formattedMessage);
                break;
            case 'info':
            default:
                this.originalConsole.log(formattedMessage);
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
        // Nothing to close for console logger
    }

    getStatus() {
        return {
            type: 'ConsoleLogger',
            isProduction: false,
            isConnected: true
        };
    }
}

module.exports = ConsoleLogger;