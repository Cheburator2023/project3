const bpmn = require('../connectors/bpmn');
const integration = require('../connectors/integration');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

module.exports = (db, common) => (req, res, next) => {
  req.context = req.context || {};

  const requestId = req.headers['x-request-id'] || uuidv4();
  const parentId = req.headers['x-parent-id'] || null;

  req.context.requestId = requestId;
  req.context.parentId = parentId;

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

  res.setHeader('X-Request-ID', requestId);

  next();
};
