/**
 * Интерфейс логгера
 */
class LoggerInterface {
    log(level, message, event = 'Информация', error = null, additionalData = {}) {
        throw new Error('Method not implemented');
    }

    trace(message, event = 'Трассировка', additionalData = {}) {
        throw new Error('Method not implemented');
    }

    debug(message, event = 'Отладка', additionalData = {}) {
        throw new Error('Method not implemented');
    }

    info(message, event = 'Информация', additionalData = {}) {
        throw new Error('Method not implemented');
    }

    warn(message, event = 'Предупреждение', additionalData = {}) {
        throw new Error('Method not implemented');
    }

    error(message, event = 'Ошибка', error = null, additionalData = {}) {
        throw new Error('Method not implemented');
    }

    fatal(message, event = 'Фатальная ошибка', error = null, additionalData = {}) {
        throw new Error('Method not implemented');
    }

    panic(message, event = 'Паника', error = null, additionalData = {}) {
        throw new Error('Method not implemented');
    }

    critical(message, event = 'Критическая ошибка', error = null, additionalData = {}) {
        throw new Error('Method not implemented');
    }

    sys(message, additionalData = {}) {
        throw new Error('Method not implemented');
    }

    close() {
        throw new Error('Method not implemented');
    }

    getStatus() {
        throw new Error('Method not implemented');
    }
}

module.exports = LoggerInterface;