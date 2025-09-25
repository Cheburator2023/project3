const ConsoleLogger = require('./ConsoleLogger');
const TSLGLogger = require('./TSLGLogger');

/**
 * Фабрика логгеров
 */
class LoggerFactory {
    static createLogger(config = {}) {
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
            return new TSLGLogger(config);
        }

        return new ConsoleLogger(config);
    }
}

module.exports = LoggerFactory;