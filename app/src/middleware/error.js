const { v4: uuidv4 } = require('uuid');
const os = require('os');

module.exports = (error, req, res, next) => {
  const statusCode = error.status || 500;
  const timestamp = new Date();

  const logData = {
    "@timestamp": timestamp.getTime() / 1000,
    "level": "error",
    "eventId": uuidv4(),
    "extEventId": req.context?.requestId || null,
    "parentId": req.context?.parentId || null,
    "text": error.message,
    "localTime": timestamp.toISOString(),
    "stack": error.stack || null,
    "PID": process.pid,
    "workerId": 0,
    "appType": "NODEJS",
    "risCode": statusCode.toString(),
    "projectCode": "SUM",
    "appName": "sum-backend",
    "timestamp": timestamp.toISOString(),
    "message": error.message,
    "envType": process.env.NODE_ENV === 'production' ? 'K8S' : 'DEV',
    "namespace": process.env.NAMESPACE || 'local-dev',
    "podName": os.hostname(),
    "tec": {
      "nodeName": os.hostname(),
      "podIp": getLocalIP() || '127.0.0.1'
    },
    "tslgClientVersion": "1.0.0",
    "eventOutcome": "Ошибка",
    "sourceUser": req.context?.user?.username || 'Unknown',
    "sourceUserId": req.context?.user?.id || 'Unknown'
  };

  console.siem(JSON.stringify(logData));

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message
  });
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