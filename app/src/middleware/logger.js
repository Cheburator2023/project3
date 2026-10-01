const os = require('os');
const { v4: uuidv4 } = require('uuid');
const { getTracingLogFields } = require('../utils/tracingContext');

module.exports =
    ({ user, host, date, requestId, parentId }) =>
        ({
             msg = '',
             event = 'Успешно',
             level = 'info',
             risCode = null,
             error = null,
             eventId = null
         }) => {

            const timestamp = new Date();
            const logId = eventId || uuidv4();
            const tracingFields = getTracingLogFields();

            const logData = {
                "@timestamp": timestamp.getTime() / 1000,
                "level": level,
                "eventId": logId,
                "extEventId": requestId || null,
                "parentId": parentId || null,
                "text": msg,
                "localTime": timestamp.toISOString(),
                "stack": error?.stack || null,
                "PID": process.pid,
                "workerId": 0,
                "appType": "NODEJS",
                "risCode": risCode || "0000",
                "projectCode": "SUM",
                "appName": "sum-backend",
                "timestamp": timestamp.toISOString(),
                "message": msg,
                "envType": process.env.NODE_ENV === 'production' ? 'K8S' : 'DEV',
                "namespace": process.env.NAMESPACE || 'local-dev',
                "podName": os.hostname(),
                "tec": {
                    "nodeName": os.hostname(),
                    "podIp": getLocalIP() || '127.0.0.1'
                },
                "tslgClientVersion": "1.0.0",
                "eventOutcome": event,
                "sourceUser": user ? user.username : 'System',
                "sourceUserId": user ? user.id : 'System',
                // Добавляем поля трассировки
                "dt.trace_id": tracingFields['dt.trace_id'] || undefined,
                "dt.span_id": tracingFields['dt.span_id'] || undefined,
            };

            console.siem(JSON.stringify(logData));
        };

function getLocalIP() {
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