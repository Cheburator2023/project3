const net = require('net');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const LoggerInterface = require('./LoggerInterface');
const { getTracingLogFields } = require('../tracingContext');

/**
 * Карта числовых приоритетов уровней логирования.
 * Чем выше число — тем выше критичность.
 * Используется для фильтрации по TSLG_LOG_LEVEL.
 *
 * Соответствует документации 1404 (Таблица 4.5.1.1, «Базовые атрибуты»):
 * TRACE, DEBUG, INFO, WARN, WARNING, ERROR, FATAL, PANIC, CRITICAL.
 */
const LOG_LEVEL_PRIORITY = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    WARNING: 3,
    ERROR: 4,
    FATAL: 5,
    PANIC: 6,
    CRITICAL: 7
};

/**
 * Нормализует строку уровня логирования:
 * - приводит к верхнему регистру;
 * - обрезает пробелы;
 * - возвращает null, если значение невалидно.
 *
 * @param {string} value
 * @returns {string|null}
 */
function normalizeLogLevel(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toUpperCase();
    if (!normalized) {
        return null;
    }

    return Object.prototype.hasOwnProperty.call(LOG_LEVEL_PRIORITY, normalized)
        ? normalized
        : null;
}

/**
 * TSLG логгер для production
 */
class TSLGLogger extends LoggerInterface {
    constructor(config = {}) {
        super();

        this.socket = null;
        this.reconnectTimeout = null;
        this.lastConnectionTime = 0;
        this.isFlushing = false;
        this.logBuffer = [];
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 3;

        this.config = this.mergeWithDefaults(config);
        this.metrics = this.initializeMetrics();

        // Используем истинный нативный console, если ConsoleOverride уже применён.
        // ConsoleOverride сохраняет оригинальные методы в console.original.
        // Это предотвращает двойное прохождение логов через переопределённый console
        // и любые побочные эффекты (в т.ч. потенциальную рекурсию).
        const nativeConsole = (typeof console !== 'undefined' && console.original) || console;
        this.originalConsole = {
            log: nativeConsole.log.bind(nativeConsole),
            error: nativeConsole.error.bind(nativeConsole),
            warn: nativeConsole.warn.bind(nativeConsole),
            info: nativeConsole.info.bind(nativeConsole),
            debug: nativeConsole.debug
                ? nativeConsole.debug.bind(nativeConsole)
                : nativeConsole.log.bind(nativeConsole),
        };

        this.initializeBuffer();
        this.connect();
    }

    mergeWithDefaults(config) {
        const defaults = {
            host: process.env.TSLG_AGENT_HOST || 'tslg-agent-svc-main',
            port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
            appName: process.env.APP_NAME || 'unknown-app',
            projectCode: process.env.PROJECT_CODE || 'UNKNOWN',
            risCode: process.env.RIS_CODE || '1404',
            appType: 'NODEJS',
            envType: 'K8S',
            tslgClientVersion: process.env.TSLG_CLIENT_VERSION || '1.0.0',
            reconnectionDelay: parseInt(process.env.TSLG_RECONNECTION_DELAY_MS || '5000', 10),
            connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '30000', 10),
            socketTimeout: parseInt(process.env.TSLG_SOCKET_TIMEOUT_MS || '10000', 10),
            maxBufferSize: parseInt(process.env.TSLG_MAX_BUFFER_SIZE || '500', 10),
            namespace: process.env.KUBERNETES_NAMESPACE || 'default',
            podName: process.env.POD_NAME || os.hostname(),
            podIp: process.env.POD_IP || this.getLocalIP() || '127.0.0.1',
            nodeName: process.env.NODE_NAME || os.hostname(),
            // Минимальный уровень логирования, отправляемый в TSLG-агент.
            // Значение читается из TSLG_LOG_LEVEL, нормализуется (info/INFO/Info => INFO).
            // Если переменная не задана или невалидна — фильтрация отключена (TRACE).
            logLevel: normalizeLogLevel(process.env.TSLG_LOG_LEVEL) || 'TRACE'
        };

        return { ...defaults, ...config };
    }

    initializeMetrics() {
        return {
            sentLogs: 0,
            failedLogs: 0,
            reconnections: 0,
            bufferFlushes: 0,
            connectionErrors: 0,
            filteredLogs: 0
        };
    }

    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const interfaceName in interfaces) {
            const addresses = interfaces[interfaceName];
            for (const address of addresses) {
                if (address.family === 'IPv4' && !address.internal) {
                    return address.address;
                }
            }
        }
        return null;
    }

    initializeBuffer() {
        this.logBuffer = [];
        this.maxBufferSize = this.config.maxBufferSize;
        this.isFlushing = false;
    }

    isConnected() {
        return !!(this.socket && !this.socket.destroyed && this.socket.writable);
    }

    /**
     * Проверяет, должен ли лог с указанным уровнем быть отправлен в TSLG-агент.
     * Если уровень неизвестен — лог не фильтруется (разрешается).
     *
     * @param {string} level
     * @returns {boolean}
     */
    shouldLog(level) {
        const normalizedLevel = normalizeLogLevel(level);
        if (!normalizedLevel) {
            // Неизвестный/пустой уровень — не блокируем, чтобы не терять логи
            return true;
        }

        const configuredLevel = normalizeLogLevel(this.config.logLevel) || 'TRACE';
        const configuredPriority = LOG_LEVEL_PRIORITY[configuredLevel];
        const currentPriority = LOG_LEVEL_PRIORITY[normalizedLevel];

        return currentPriority >= configuredPriority;
    }

    connect() {
        if (this.connectionAttempts >= this.maxConnectionAttempts) {
            this.originalConsole.error(`Max connection attempts (${this.maxConnectionAttempts}) reached. Giving up.`);
            return;
        }

        this.connectionAttempts++;

        try {
            this.originalConsole.log(`Attempting to connect to TSLG agent at ${this.config.host}:${this.config.port} (attempt ${this.connectionAttempts})`);

            this.socket = net.createConnection({
                host: this.config.host,
                port: this.config.port
            });

            this.setupSocketEventHandlers();
            this.socket.setTimeout(this.config.socketTimeout);
            this.socket.setKeepAlive(true, 60000);

        } catch (error) {
            this.originalConsole.error('Failed to create TSLG connection:', error.message);
            this.scheduleReconnect();
        }
    }

    setupSocketEventHandlers() {
        this.socket.on('connect', () => {
            this.lastConnectionTime = Date.now();
            this.connectionAttempts = 0;
            this.metrics.reconnections++;
            this.originalConsole.log(`TSLG connected successfully to ${this.config.host}:${this.config.port}`);
            this.flushBuffer();
        });

        this.socket.on('error', (error) => {
            this.metrics.connectionErrors++;
            this.originalConsole.error(`TSLG connection error: ${error.message}`);
            this.scheduleReconnect();
        });

        this.socket.on('close', (hadError) => {
            this.originalConsole.log(`TSLG connection closed${hadError ? ' with error' : ''}`);
            if (hadError) {
                this.scheduleReconnect();
            }
        });

        this.socket.on('timeout', () => {
            this.originalConsole.error('TSLG connection timeout');
            this.safeReconnect();
        });

        this.socket.on('drain', () => {
            this.flushBuffer();
        });
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const delay = this.calculateReconnectDelay();
        this.originalConsole.log(`Scheduling reconnect in ${delay}ms`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    calculateReconnectDelay() {
        const baseDelay = this.config.reconnectionDelay;
        const maxDelay = 30000;
        const delay = Math.min(baseDelay * Math.pow(1.5, this.connectionAttempts - 1), maxDelay);
        return delay;
    }

    safeReconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.scheduleReconnect();
    }

    bufferLog(logData) {
        if (this.logBuffer.length >= this.maxBufferSize) {
            this.logBuffer.shift();
            this.metrics.failedLogs++;
            this.originalConsole.warn('TSLG buffer overflow, removed oldest log');
        }

        this.logBuffer.push(logData);

        if (!this.isFlushing && this.isConnected()) {
            setImmediate(() => this.flushBuffer());
        }
    }

    async flushBuffer() {
        if (!this.isConnected() || this.isFlushing || this.logBuffer.length === 0) {
            return;
        }

        this.isFlushing = true;
        this.metrics.bufferFlushes++;

        try {
            while (this.logBuffer.length > 0 && this.isConnected()) {
                const logData = this.logBuffer[0];

                try {
                    const success = this.socket.write(logData);

                    if (success) {
                        this.logBuffer.shift();
                        this.metrics.sentLogs++;
                    } else {
                        break;
                    }
                } catch (error) {
                    this.originalConsole.error('Error writing to socket:', error.message);
                    break;
                }

                if (this.logBuffer.length > 5) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
        } finally {
            this.isFlushing = false;
        }
    }

    createLogEntry(level, message, event, error, additionalData) {
        const timestamp = new Date();

        // Получаем поля трассировки
        const tracingFields = getTracingLogFields();

        const logEntry = {
            "@timestamp": timestamp.getTime() / 1000,
            "level": level.toLowerCase(),
            "eventId": uuidv4(),
            "text": typeof message === 'string' ? message : JSON.stringify(message, null, 2),
            "localTime": timestamp.toISOString(),
            "PID": process.pid,
            "appType": this.config.appType,
            "projectCode": this.config.projectCode,
            "appName": this.config.appName,
            "timestamp": timestamp.toISOString(),
            "envType": this.config.envType,
            "namespace": this.config.namespace,
            "podName": this.config.podName,
            "tec": {
                "nodeName": this.config.nodeName,
                "podIp": this.config.podIp
            },
            "tslgClientVersion": this.config.tslgClientVersion,
            "eventOutcome": event,
            "risCode": this.config.risCode,
            // Добавляем поля трассировки
            "dt.trace_id": tracingFields['dt.trace_id'] || undefined,
            "dt.span_id": tracingFields['dt.span_id'] || undefined,
            ...this.sanitizeData(additionalData)
        };

        if (error) {
            if (error instanceof Error) {
                logEntry.stack = error.stack ? error.stack.split('\n').map(line => line.trim()).join('\n') : '';
                logEntry.errorMessage = error.message;
            } else {
                logEntry.error = JSON.stringify(error);
            }
        }

        return logEntry;
    }

    sanitizeData(data) {
        if (!data || typeof data !== 'object') return {};

        const sensitiveFields = [
            'password', 'token', 'jwt', 'accessToken', 'refreshToken',
            'authorization', 'secret', 'apiKey', 'credentials'
        ];

        const sanitized = JSON.parse(JSON.stringify(data));

        const sanitizeRecursive = (obj) => {
            for (const key in obj) {
                if (sensitiveFields.includes(key.toLowerCase())) {
                    obj[key] = '*****';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeRecursive(obj[key]);
                }
            }
        };

        if (Object.keys(sanitized).length > 0) {
            sanitizeRecursive(sanitized);
        }

        return sanitized;
    }

    log(level, message, event = 'Информация', error = null, additionalData = {}) {
        // Фильтрация по TSLG_LOG_LEVEL:
        // - если уровень ниже настроенного — лог не отправляется в TSLG-агент;
        // - консольный вывод ниже также подавляется, чтобы соответствовать настроенному уровню.
        if (!this.shouldLog(level)) {
            this.metrics.filteredLogs++;
            return;
        }

        const logEntry = this.createLogEntry(level, message, event, error, additionalData);
        const logData = JSON.stringify(logEntry) + '\n';

        this.writeToConsole(level, message, event, error);

        if (!this.isConnected()) {
            this.bufferLog(logData);
            return;
        }

        try {
            if (this.socket.writableLength < 65536) {
                const success = this.socket.write(logData);
                if (success) {
                    this.metrics.sentLogs++;
                } else {
                    this.bufferLog(logData);
                }
            } else {
                this.bufferLog(logData);
            }
        } catch (error) {
            this.originalConsole.error('Failed to send log to TSLG:', error.message);
            this.bufferLog(logData);
        }
    }

    writeToConsole(level, message, event, error) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase();
        const logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${message}`;

        if (error) {
            this.originalConsole.error(logMessage, error);
        } else {
            this.originalConsole.log(logMessage);
        }
    }

    trace(message, event = 'Трассировка', additionalData = {}) {
        this.log('trace', message, event, null, additionalData);
    }

    debug(message, event = 'Отладка', additionalData = {}) {
        this.log('debug', message, event, null, additionalData);
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

    fatal(message, event = 'Фатальная ошибка', error = null, additionalData = {}) {
        this.log('fatal', message, event, error, additionalData);
    }

    panic(message, event = 'Паника', error = null, additionalData = {}) {
        this.log('panic', message, event, error, additionalData);
    }

    critical(message, event = 'Критическая ошибка', error = null, additionalData = {}) {
        this.log('critical', message, event, error, additionalData);
    }

    sys(message, additionalData = {}) {
        this.log('info', message, 'Системное', null, additionalData);
    }

    close() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.logBuffer.length > 0) {
            this.originalConsole.log(`Attempting to flush ${this.logBuffer.length} buffered logs before shutdown`);
            this.flushBufferSync();
        }

        if (this.socket) {
            this.socket.destroy();
        }

        this.originalConsole.log('TSLG logger closed');
    }

    flushBufferSync() {
        if (!this.isConnected() || this.logBuffer.length === 0) return;

        let attempts = 0;
        while (this.logBuffer.length > 0 && attempts < 3) {
            try {
                const logData = this.logBuffer[0];
                const success = this.socket.write(logData);

                if (success) {
                    this.logBuffer.shift();
                    this.metrics.sentLogs++;
                } else {
                    attempts++;
                }
            } catch (error) {
                attempts++;
                break;
            }
        }
    }

    getStatus() {
        return {
            type: 'TSLGLogger',
            isProduction: true,
            isConnected: this.isConnected(),
            config: {
                host: this.config.host,
                port: this.config.port,
                appName: this.config.appName,
                logLevel: this.config.logLevel
            },
            metrics: { ...this.metrics },
            bufferSize: this.logBuffer.length,
            connectionAttempts: this.connectionAttempts
        };
    }
}

module.exports = TSLGLogger;