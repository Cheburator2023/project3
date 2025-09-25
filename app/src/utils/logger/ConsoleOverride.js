/**
 * Переопределение console для единообразного логирования
 */
class ConsoleOverride {
    constructor(logger) {
        this.logger = logger;
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };
    }

    formatArgs(args) {
        return args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    apply() {
        console.log = (...args) => {
            const message = this.formatArgs(args);
            this.logger.info(message, 'Информация');
        };

        console.info = (...args) => {
            const message = this.formatArgs(args);
            this.logger.info(message, 'Информация');
        };

        console.warn = (...args) => {
            const message = this.formatArgs(args);
            this.logger.warn(message, 'Предупреждение');
        };

        console.error = (...args) => {
            const message = this.formatArgs(args);
            const error = args.find(arg => arg instanceof Error);
            this.logger.error(message, 'Ошибка', error);
        };

        console.debug = (...args) => {
            const message = this.formatArgs(args);
            this.logger.info(message, 'Отладка');
        };

        console.sys = (...args) => {
            const message = this.formatArgs(args);
            this.logger.sys(message);
        };

        console.siem = (...args) => {
            const message = this.formatArgs(args);
            this.originalConsole.log('[SIEM]', message);
        };

        console.original = this.originalConsole;
    }

    restore() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;
        delete console.sys;
        delete console.siem;
        delete console.original;
    }
}

module.exports = ConsoleOverride;