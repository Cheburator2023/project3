const net = require('net');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class TSLGLogger {
    constructor() {
        this.socket = null;
        this.reconnectTimeout = null;
        this.lastConnectionTime = 0;
        this.isProduction = process.env.NODE_ENV === 'production';

        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        this.config = {
            host: process.env.TSLG_AGENT_HOST || 'tslg-agent-svc-main.dk1-sumd01-sumd-core.svc.cluster.local',
            port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
            appName: process.env.APP_NAME || 'sum-backend',
            projectCode: process.env.PROJECT_CODE || 'SUM',
            risCode: process.env.RIS_CODE || '1404',
            appType: 'NODEJS',
            envType: this.isProduction ? 'K8S' : 'DEV',
            tslgClientVersion: process.env.TSLG_CLIENT_VERSION || '1.0.0',
            reconnectionDelay: parseInt(process.env.TSLG_RECONNECTION_DELAY_MS || '1000', 10),
            connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '2000', 10),
            namespace: process.env.KUBERNETES_NAMESPACE || 'local-dev',
            podName: process.env.POD_NAME || os.hostname(),
            podIp: process.env.POD_IP || this.getLocalIP() || '127.0.0.1',
            nodeName: process.env.NODE_NAME || os.hostname()
        };

        if (this.isProduction) {
            this.connect();
        }
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

    connect() {
        if (!this.isProduction) return;

        try {
            this.socket = net.createConnection(
                {
                    host: this.config.host,
                    port: this.config.port,
                },
                () => {
                    this.lastConnectionTime = Date.now();
                    this.originalConsole.error('TSLG Logger connected successfully');
                }
            );

            this.socket.on('error', (error) => {
                this.originalConsole.error('TSLG Logger connection error:', error.message);
                this.scheduleReconnect();
            });

            this.socket.on('close', () => {
                this.originalConsole.error('TSLG Logger connection closed');
                this.scheduleReconnect();
            });

            this.socket.on('timeout', () => {
                this.originalConsole.error('TSLG Logger connection timeout');
                this.socket.destroy();
                this.scheduleReconnect();
            });

            this.socket.setTimeout(5000);

        } catch (error) {
            this.originalConsole.error('Failed to create TSLG connection:', error.message);
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (!this.isProduction) return;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, this.config.reconnectionDelay);
    }

    shouldReconnect() {
        if (!this.isProduction) return false;
        return Date.now() - this.lastConnectionTime >= this.config.connectionTTL;
    }

    log(level, message, event = 'Информация', error = null, additionalData = {}) {
        const logEntry = this.formatLogEntry(level, message, event, error, additionalData);

        if (!this.isProduction) {
            this.consoleLog(logEntry);
            return;
        }

        if (this.socket && this.socket.writable) {
            if (this.shouldReconnect()) {
                this.socket.destroy();
                this.connect();
                return;
            }

            try {
                const logData = JSON.stringify(logEntry);
                this.socket.write(logData + '\n');
            } catch (error) {
                this.originalConsole.error('Failed to send log to TSLG:', error.message);
            }
        }

        this.consoleLog(logEntry);
    }

    formatLogEntry(level, message, event, error, additionalData) {
        const timestamp = new Date();
        const logEntry = {
            "@timestamp": timestamp.getTime() / 1000,
            "level": level.toLowerCase(),
            "eventId": uuidv4(),
            "text": typeof message === 'string' ? message : JSON.stringify(message),
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
            "risCode": this.config.risCode
        };

        if (Object.keys(additionalData).length > 0) {
            Object.assign(logEntry, this.sanitizeData(additionalData));
        }

        if (error) {
            if (error instanceof Error) {
                logEntry.stack = this.cleanStack(error.stack);
                logEntry.errorMessage = error.message;
            } else {
                logEntry.error = JSON.stringify(error);
            }
        }

        return logEntry;
    }

    cleanStack(stack) {
        if (!stack) return '';
        return stack.split('\n')
            .map(line => line.trim())
            .join('\n');
    }

    consoleLog(logEntry) {
        if (!this.isProduction) {
            const jsonLog = JSON.stringify(logEntry, null, 2);
            this.originalConsole.log(jsonLog);
            return;
        }

        const jsonLog = JSON.stringify(logEntry);
        this.originalConsole.log(jsonLog);
    }

    sanitizeData(data) {
        const sensitiveFields = [
            'password', 'token', 'jwt', 'accessToken', 'refreshToken',
            'authorization', 'secret', 'apiKey', 'credentials'
        ];

        const sanitized = { ...data };
        for (const [key, value] of Object.entries(sanitized)) {
            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '*****';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            }
        }

        return sanitized;
    }

    close() {
        if (!this.isProduction) return;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.socket) {
            this.socket.destroy();
        }
    }
}

const tslgLogger = new TSLGLogger();

module.exports = {
    log: (msg, event = 'Информация', level = 'info', error = null, additionalData = {}) => {
        tslgLogger.log(level, msg, event, error, additionalData);
    },

    info: (msg, event = 'Информация', additionalData = {}) => {
        tslgLogger.log('info', msg, event, null, additionalData);
    },

    error: (msg, event = 'Ошибка', error = null, additionalData = {}) => {
        tslgLogger.log('error', msg, event, error, additionalData);
    },

    warn: (msg, event = 'Предупреждение', additionalData = {}) => {
        tslgLogger.log('warn', msg, event, null, additionalData);
    },

    sys: (msg, additionalData = {}) => {
        tslgLogger.log('info', msg, 'Системное', null, additionalData);
    },

    close: () => tslgLogger.close()
};