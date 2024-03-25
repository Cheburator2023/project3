// Modules
const express = require('express');

// Middlewares
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { keycloak, authMiddleware } = require('./middleware/auth');
const errorMiddleware = require('./middleware/error');
const context = require('./middleware/context');

// Graphql Route
const graphqlRoute = require('./route/graphql');

// Rest Route
const apiRoute = require('./route/rest');

// Connetors
const database = require('./connectors/database');
const bpmn = require('./connectors/bpmn');
const integration = require('./connectors/integration');
const models = require('./models');
const camundaTasks = require('./connectors/external');
const notification = require('./connectors/notification');
const mr_coef = require('./connectors/mr_coef');
const commonConnectors = require('./connectors/common');

const server = async () => {
  const app = express();

  await database.initialize()
  const db = models(database, bpmn, integration);
  const common = commonConnectors(database, bpmn);

  camundaTasks(db, integration, bpmn, common);
  notification(db, bpmn, integration);
  mr_coef(database);

  app.use(cors());
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use('/health', (req, res) => res.status(200).end());
  app.use(keycloak.middleware(), keycloak.protect());
  app.use(authMiddleware);
  app.use(errorMiddleware);
  app.use(context(db, common));
  app.use('/', apiRoute);

  graphqlRoute.applyMiddleware({ app });

  return app;
};

module.exports = server;
