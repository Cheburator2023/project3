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
            info: console.info,
            debug: console.debug
        };
    }

    safeStringify(obj, depth = 0) {
        if (depth > 10) return '[Circular]';

        try {
            if (obj === null || obj === undefined) return String(obj);
            if (typeof obj === 'string') return obj;
            if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
            if (obj instanceof Error) return obj.toString();
            if (typeof obj === 'object') {
                return JSON.stringify(obj, null, 2);
            }
            return String(obj);
        } catch (error) {
            return `[Stringification error: ${error.message}]`;
        }
    }

    formatMessage(level, message, event, error, additionalData) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase();

        let logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${this.safeStringify(message)}`;

        if (error) {
            logMessage += ` | Error: ${this.safeStringify(error)}`;
        }

        if (additionalData && Object.keys(additionalData).length > 0) {
            logMessage += ` | Data: ${this.safeStringify(additionalData)}`;
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