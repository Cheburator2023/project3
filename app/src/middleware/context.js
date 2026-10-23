const bpmn = require('../connectors/bpmn');
const integration = require('../connectors/integration');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');
const { setDynatraceHeader } = require('../utils/tracingContext');
const tslgLogger = require('../utils/logger');
const CONTEXT_MIDDLEWARE = 'ContextMiddleware';

module.exports = (db, common) => (req, res, next) => {
  req.context = req.context || {};

  const requestId = req.headers['x-request-id'] || uuidv4();
  const parentId = req.headers['x-parent-id'] || null;

  req.context.requestId = requestId;
  req.context.parentId = parentId;

  // Извлекаем заголовок x-dynatrace и сохраняем его в контекст OpenTelemetry
  const dynatraceHeader = req.headers['x-dynatrace'];
  if (dynatraceHeader) {
      tslgLogger.info(`Incomming x-dynatrace header: ${dynatraceHeader}`, CONTEXT_MIDDLEWARE);
    setDynatraceHeader(dynatraceHeader);
    // Также сохраняем в req.context для явного использования, если потребуется
    req.context.dynatraceHeader = dynatraceHeader;
  } else {
      tslgLogger.info('No x-dynatrace header in incoming request', CONTEXT_MIDDLEWARE);
  }

  req.context.log = logger({
    user: req.context.user,
    host: req.headers.host,
    date: new Date(),
    requestId,
    parentId
  });

  req.context.db = db;
  req.context.bpmn = bpmn;
  req.context.integration = integration;
  req.context.common = common;

  // Сохраняем ссылку на HTTP-запрос для AuditInitiatorHelper
  // (используется для извлечения IP, URL, метода операции)
  req.context.req = req;

  res.setHeader('X-Request-ID', requestId);

  next();
};
