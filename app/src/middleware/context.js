const bpmn = require('../connectors/bpmn');
const integration = require('../connectors/integration');
const logger = require('./logger');

module.exports = (db, common) => (req, res, next) => {
  if (!req.context) {
    req.context = {};
  }

  req.context.log = logger({
    user: req.context.user,
    host: req.headers.host,
    date: new Date(),
  });

  req.context.db = db;
  req.context.bpmn = bpmn;
  req.context.integration = integration;
  req.context.common = common;

  next();
};
