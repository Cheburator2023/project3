// Modules
const express = require('express');

// Middlewares
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const logger = require('./utils/logger');
const { keycloak, authMiddleware } = require('./middleware/auth');
const errorMiddleware = require('./middleware/error');
const context = require('./middleware/context');

// Graphql Route
const graphqlRoute = require('./route/graphql');

// Rest Route
const apiRoute = require('./route/rest');
const nlpAdAuthRoute = require('./route/rest/nlp/adAuth');

// Connetors
const database = require('./connectors/database');
const bpmn = require('./connectors/bpmn');
const integration = require('./connectors/integration');
const models = require('./models');
const camundaTasks = require('./connectors/external');
const notification = require('./connectors/notification');
const mr_coef = require('./connectors/mr_coef');
const commonConnectors = require('./connectors/common');
const { createModelStateResolverWorker } = require('./connectors/database/postgres/workers/model_state_resolver')

const server = async () => {
  const app = express();
  const dbSignalHandlers = captureNewSignalHandlers()
  let modelStateResolverWorker = null

  try {
    await database.initialize()
    detachNewSignalHandlers(dbSignalHandlers)

    const db = models(database, bpmn, integration);
    const common = commonConnectors(database, bpmn);
    modelStateResolverWorker = createModelStateResolverWorker(database, { logger })

    camundaTasks(db, integration, bpmn, common);
    notification(db, bpmn, integration);
    mr_coef(database);

    await modelStateResolverWorker.start()

    app.use(cors());
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use('/health', (req, res) => res.status(200).end());
    app.use('/v1/ad-auth', context(integration), nlpAdAuthRoute);

    app.use(keycloak.middleware(), keycloak.protect());
    app.use(authMiddleware);
    app.use(errorMiddleware);
    app.use(context(db, common));
    app.use('/', apiRoute);

    graphqlRoute.applyMiddleware({ app });

      return {
        app,
        async stop () {
        await modelStateResolverWorker.stop()
        await database.closePool()
      }
    }
  } catch (error) {
    detachNewSignalHandlers(dbSignalHandlers)

    if (modelStateResolverWorker) {
      try {
        await modelStateResolverWorker.stop()
      } catch {
      }
    }

    await database.closePool()
    throw error
  }
};

function captureNewSignalHandlers () {
  return {
    sigterm: process.listeners('SIGTERM'),
    sigint: process.listeners('SIGINT')
  }
}

function detachNewSignalHandlers (before) {
  for (const listener of process.listeners('SIGTERM')) {
    if (!before.sigterm.includes(listener)) {
      process.removeListener('SIGTERM', listener)
    }
  }

  for (const listener of process.listeners('SIGINT')) {
    if (!before.sigint.includes(listener)) {
      process.removeListener('SIGINT', listener)
    }
  }
}

module.exports = server;
