const ConsoleLogger = require('./ConsoleLogger');
const ProductionLogger = require('./ProductionLogger');

/**
 * Фабрика логгеров
 */
class LoggerFactory {
    static createLogger(config = {}) {
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction) {
            return new ProductionLogger(config);
        }

        return new ConsoleLogger(config);
    }
}

module.exports = LoggerFactory;