const tslgLogger = require('./tslgLogger');

const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
};

const formatMessage = (args) => {
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
};

const overrideConsole = () => {
    console.log = function(...args) {
        const message = formatMessage(args);
        tslgLogger.info(message, 'Информация');
    };

    console.info = function(...args) {
        const message = formatMessage(args);
        tslgLogger.info(message, 'Информация');
    };

    console.warn = function(...args) {
        const message = formatMessage(args);
        tslgLogger.warn(message, 'Предупреждение');
    };

    console.error = function(...args) {
        const message = formatMessage(args);
        const error = args.find(arg => arg instanceof Error);
        tslgLogger.error(message, 'Ошибка', error);
    };

    console.sys = function(...args) {
        const message = formatMessage(args);
        tslgLogger.sys(message);
    };

    console.siem = function(...args) {
        const message = formatMessage(args);
        originalConsole.log('[SIEM]', message);
    };
};

overrideConsole();

module.exports = tslgLogger;