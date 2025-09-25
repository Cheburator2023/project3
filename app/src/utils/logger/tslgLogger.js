const net = require('net');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const LoggerInterface = require('./LoggerInterface');

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

        this.config = this.mergeWithDefaults(config);
        this.metrics = this.initializeMetrics();
        this.originalConsole = this.getOriginalConsole();

        this.initializeBuffer();
        this.startMetricsMonitoring();
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
            reconnectionDelay: parseInt(process.env.TSLG_RECONNECTION_DELAY_MS || '2000', 10),
            connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '30000', 10),
            socketTimeout: parseInt(process.env.TSLG_SOCKET_TIMEOUT_MS || '15000', 10),
            maxBufferSize: parseInt(process.env.TSLG_MAX_BUFFER_SIZE || '1000', 10),
            namespace: process.env.KUBERNETES_NAMESPACE || 'default',
            podName: process.env.POD_NAME || os.hostname(),
            podIp: process.env.POD_IP || this.getLocalIP() || '127.0.0.1',
            nodeName: process.env.NODE_NAME || os.hostname()
        };

        return { ...defaults, ...config };
    }

    initializeMetrics() {
        return {
            sentLogs: 0,
            failedLogs: 0,
            reconnections: 0,
            bufferFlushes: 0
        };
    }

    getOriginalConsole() {
        return {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
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

    startMetricsMonitoring() {
        setInterval(() => {
            this.originalConsole.log('TSLG Metrics:', {
                sent: this.metrics.sentLogs,
                failed: this.metrics.failedLogs,
                reconnections: this.metrics.reconnections,
                bufferSize: this.logBuffer.length,
                connected: this.isConnected()
            });
        }, 60000);
    }

    isConnected() {
        return !!(this.socket && !this.socket.destroyed && this.socket.writable);
    }

    connect() {
        try {
            this.socket = net.createConnection(
                {
                    host: this.config.host,
                    port: this.config.port,
                },
                () => {
                    this.lastConnectionTime = Date.now();
                    this.metrics.reconnections++;
                    this.originalConsole.log(`TSLG connected to ${this.config.host}:${this.config.port}`);
                    this.flushBuffer();
                }
            );

            this.setupSocketEventHandlers();
            this.socket.setTimeout(this.config.socketTimeout);

        } catch (error) {
            this.originalConsole.error('Failed to create TSLG connection:', error.message);
            this.scheduleReconnect();
        }
    }

    setupSocketEventHandlers() {
        this.socket.on('error', (error) => {
            this.originalConsole.error('TSLG connection error:', error.message);
            this.scheduleReconnect();
        });

        this.socket.on('close', (hadError) => {
            this.originalConsole.log(`TSLG connection closed${hadError ? ' with error' : ''}`);
            this.scheduleReconnect();
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

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, this.config.reconnectionDelay);
    }

    shouldReconnect() {
        const timeSinceLastConnection = Date.now() - this.lastConnectionTime;
        const needsBalanceReconnect = timeSinceLastConnection >= this.config.connectionTTL;

        return !this.isConnected() || needsBalanceReconnect;
    }

    safeReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

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
        }

        this.logBuffer.push(logData);

        if (!this.isFlushing && this.isConnected()) {
            setTimeout(() => this.flushBuffer(), 10);
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
                const success = this.socket.write(logData);

                if (success) {
                    this.logBuffer.shift();
                    this.metrics.sentLogs++;
                } else {
                    break;
                }

                if (this.logBuffer.length > 10) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
        } catch (error) {
            this.originalConsole.error('Buffer flush error:', error.message);
        } finally {
            this.isFlushing = false;
        }
    }

    createLogEntry(level, message, event, error, additionalData) {
        const timestamp = new Date();

        return {
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
            ...this.sanitizeData(additionalData),
            ...this.formatError(error)
        };
    }

    formatError(error) {
        if (!error) return {};

        if (error instanceof Error) {
            return {
                stack: this.cleanStack(error.stack),
                errorMessage: error.message
            };
        }

        return { error: JSON.stringify(error) };
    }

    cleanStack(stack) {
        return stack ? stack.split('\n').map(line => line.trim()).join('\n') : '';
    }

    sanitizeData(data) {
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

        sanitizeRecursive(sanitized);
        return sanitized;
    }

    log(level, message, event = 'Информация', error = null, additionalData = {}) {
        const logEntry = this.createLogEntry(level, message, event, error, additionalData);
        const logData = JSON.stringify(logEntry) + '\n';

        this.writeToConsole(logEntry);

        if (this.shouldReconnect()) {
            this.safeReconnect();
        }

        if (this.isConnected()) {
            this.tryDirectSend(logData);
        } else {
            this.bufferLog(logData);
            this.safeReconnect();
        }
    }

    tryDirectSend(logData) {
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
            this.originalConsole.error('Send error:', error.message);
            this.bufferLog(logData);
        }
    }

    writeToConsole(logEntry) {
        const timestamp = new Date().toISOString();
        const level = logEntry.level.toUpperCase();
        const message = `[${timestamp}] [${level}] ${logEntry.text}`;

        switch (logEntry.level) {
            case 'error':
                this.originalConsole.error(message);
                break;
            case 'warn':
                this.originalConsole.warn(message);
                break;
            default:
                this.originalConsole.log(message);
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
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.logBuffer.length > 0 && this.isConnected()) {
            this.originalConsole.log(`Flushing ${this.logBuffer.length} logs before shutdown`);
            this.flushBufferSync();
        }

        if (this.socket) {
            this.socket.destroy();
        }

        this.originalConsole.log('TSLG logger closed');
    }

    flushBufferSync() {
        if (!this.isConnected()) return;

        for (let i = 0; i < 3 && this.logBuffer.length > 0; i++) {
            try {
                const logData = this.logBuffer[0];
                const success = this.socket.write(logData);

                if (success) {
                    this.logBuffer.shift();
                    this.metrics.sentLogs++;
                }
            } catch (error) {
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
                appName: this.config.appName
            },
            metrics: { ...this.metrics },
            bufferSize: this.logBuffer.length
        };
    }
}

module.exports = TSLGLogger;