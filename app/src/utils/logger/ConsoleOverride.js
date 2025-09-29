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
        this.isOverridden = false;
        this.recursionGuard = new Set();
    }

    safeStringify(arg, depth = 0) {
        if (depth > 5) return '[Maximum depth exceeded]';

        try {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'string') return arg;
            if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
            if (arg instanceof Error) return arg.toString();
            if (typeof arg === 'object') {
                if (arg instanceof Date) return arg.toISOString();
                if (Array.isArray(arg)) {
                    return `[${arg.map(item => this.safeStringify(item, depth + 1)).join(', ')}]`;
                }
                const keys = Object.keys(arg).slice(0, 10);
                const pairs = keys.map(key => `${key}: ${this.safeStringify(arg[key], depth + 1)}`);
                return `{${pairs.join(', ')}}`;
            }
            return String(arg);
        } catch (error) {
            return `[Stringification error: ${error.message}]`;
        }
    }

    formatArgs(args) {
        return args.map(arg => this.safeStringify(arg)).join(' ');
    }

    createWrappedMethod(originalMethod, level) {
        return (...args) => {
            if (this.recursionGuard.has(level)) {
                return originalMethod.apply(console, args);
            }

            this.recursionGuard.add(level);

            try {
                const message = this.formatArgs(args);

                switch (level) {
                    case 'error':
                        this.logger.error(message, 'Ошибка');
                        break;
                    case 'warn':
                        this.logger.warn(message, 'Предупреждение');
                        break;
                    case 'info':
                    case 'log':
                    default:
                        this.logger.info(message, 'Информация');
                        break;
                    case 'debug':
                        this.logger.info(message, 'Отладка');
                        break;
                }
            } catch (error) {
                originalMethod.apply(console, ['Logger error:', error.message, ...args]);
            } finally {
                this.recursionGuard.delete(level);
            }
        };
    }

    apply() {
        if (this.isOverridden) return;

        console.log = this.createWrappedMethod(this.originalConsole.log, 'log');
        console.info = this.createWrappedMethod(this.originalConsole.info, 'info');
        console.warn = this.createWrappedMethod(this.originalConsole.warn, 'warn');
        console.error = this.createWrappedMethod(this.originalConsole.error, 'error');
        console.debug = this.createWrappedMethod(this.originalConsole.debug, 'debug');

        console.sys = (...args) => {
            const message = this.formatArgs(args);
            this.logger.sys(message);
        };

        console.siem = (...args) => {
            const message = this.formatArgs(args);
            this.originalConsole.log('[SIEM]', message);
        };

        console.original = this.originalConsole;
        this.isOverridden = true;
    }

    restore() {
        if (!this.isOverridden) return;

        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;

        delete console.sys;
        delete console.siem;
        delete console.original;

        this.isOverridden = false;
    }
}

module.exports = ConsoleOverride;