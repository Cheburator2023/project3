const os = require('os');
const { v4: uuidv4 } = require('uuid');

class GlobalLogger {
    constructor() {
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };

        this.originalProcess = {
            emitWarning: process.emitWarning
        };

        this.originalStdoutWrite = process.stdout.write;
        this.originalStderrWrite = process.stderr.write;

        this.setupGlobalHandlers();
    }

    formatLog(level, message, additionalData = {}) {
        const timestamp = new Date();
        return {
            "@timestamp": timestamp.getTime() / 1000,
            "level": level,
            "eventId": uuidv4(),
            "text": typeof message === 'string' ? message : JSON.stringify(message),
            "localTime": timestamp.toISOString(),
            "PID": process.pid,
            "appType": "NODEJS",
            "projectCode": "SUM",
            "appName": "sum-backend",
            "timestamp": timestamp.toISOString(),
            "envType": process.env.NODE_ENV === 'production' ? 'K8S' : 'DEV',
            "namespace": process.env.NODE_ENV || 'local-dev',
            "podName": os.hostname(),
            "tec": {
                "nodeName": os.hostname(),
                "podIp": this.getLocalIP() || '127.0.0.1'
            },
            "tslgClientVersion": "1.0.0",
            "eventOutcome": "Системное",
            ...additionalData
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

    setupGlobalHandlers() {
        // Перехват console методов
        console.log = (...args) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
            this.originalConsole.log(JSON.stringify(
                this.formatLog('info', message, {
                    eventOutcome: 'Информация',
                    source: 'console.log'
                })
            ));
        };

        console.error = (...args) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
            const error = args.find(arg => arg instanceof Error);

            this.originalConsole.error(JSON.stringify(
                this.formatLog('error', message, {
                    eventOutcome: 'Ошибка',
                    stack: error?.stack,
                    risCode: '500',
                    source: 'console.error'
                })
            ));
        };

        console.warn = (...args) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
            this.originalConsole.warn(JSON.stringify(
                this.formatLog('warn', message, {
                    eventOutcome: 'Предупреждение',
                    risCode: '300',
                    source: 'console.warn'
                })
            ));
        };

        console.info = (...args) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
            this.originalConsole.info(JSON.stringify(
                this.formatLog('info', message, {
                    eventOutcome: 'Информация',
                    source: 'console.info'
                })
            ));
        };

        console.debug = (...args) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : arg
            ).join(' ');
            this.originalConsole.debug(JSON.stringify(
                this.formatLog('debug', message, {
                    eventOutcome: 'Отладка',
                    source: 'console.debug'
                })
            ));
        };

        // Перехват process warnings
        process.emitWarning = (warning, options) => {
            const warningMessage = typeof warning === 'string' ? warning : warning.message;
            this.originalConsole.warn(JSON.stringify(
                this.formatLog('warn', warningMessage, {
                    eventOutcome: 'Предупреждение',
                    risCode: '300',
                    source: 'process.warning',
                    warningType: options?.type || 'Warning'
                })
            ));

            return this.originalProcess.emitWarning(warning, options);
        };

        // Перехват uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.originalConsole.error(JSON.stringify(
                this.formatLog('error', `Uncaught Exception: ${error.message}`, {
                    eventOutcome: 'КритическаяОшибка',
                    stack: error.stack,
                    risCode: '500',
                    source: 'uncaughtException'
                })
            ));
        });

        // Перехват unhandled rejections
        process.on('unhandledRejection', (reason, promise) => {
            const message = reason instanceof Error ? reason.message : String(reason);
            this.originalConsole.error(JSON.stringify(
                this.formatLog('error', `Unhandled Rejection: ${message}`, {
                    eventOutcome: 'КритическаяОшибка',
                    stack: reason instanceof Error ? reason.stack : undefined,
                    risCode: '500',
                    source: 'unhandledRejection'
                })
            ));
        });

        // Перехват stdout/stderr для перехвата логов Camunda
        process.stdout.write = (chunk, encoding, callback) => {
            if (typeof chunk === 'string') {
                // Пытаемся определить, это лог Camunda или что-то еще
                if (chunk.includes('✖') || chunk.includes('couldn\'t complete task')) {
                    this.originalConsole.error(JSON.stringify(
                        this.formatLog('error', chunk.trim(), {
                            eventOutcome: 'ОшибкаCamunda',
                            risCode: '500',
                            source: 'camunda-stdout'
                        })
                    ));
                    return true;
                }
            }
            return this.originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
        };

        process.stderr.write = (chunk, encoding, callback) => {
            if (typeof chunk === 'string') {
                this.originalConsole.error(JSON.stringify(
                    this.formatLog('error', chunk.trim(), {
                        eventOutcome: 'Ошибка',
                        risCode: '500',
                        source: 'stderr'
                    })
                ));
            }
            return this.originalStderrWrite.call(process.stderr, chunk, encoding, callback);
        };
    }
}

module.exports = GlobalLogger;