const client = require("./connector");

const Jira = require("./jira");
const Teamcity = require("./teamcity");
const Mail = require("./mail");
const Kafka = require("./kafka");
const Database = require("./db");
const Validation = require("./validation");
const System = require("./system");
const Git = require("./git");
const AutoMl = require("./automl");

module.exports = (db, integration, bpmn, common) => {
  // Jira Handler
  const jira = new Jira(db, integration);
  client.subscribe("jiraIssue", jira.issue);
  client.subscribe("jiraStatus", jira.status);

  // Teamcity Handler
  const teamcity = new Teamcity(db, integration);
  client.subscribe("teamcity", teamcity.main);
  client.subscribe("publish", teamcity.publish);

  // Kafka Handler
  const kafka = new Kafka(db, integration);
  client.subscribe("kafka_createNewModel", kafka.createNewModel);
  client.subscribe("kafka_archiveModel", kafka.archiveModel);
  client.subscribe("kafka_createNewStrategy", kafka.kafka_createNewStrategy);

  // Mail Handler
  const mail = new Mail(db, integration);
  client.subscribe("mail", mail.main);

  // Database Handler
  const database = new Database(db, integration);
  client.subscribe("artefacts", database.artefacts);

  // Validation Handler
  const validation = new Validation(db, integration);
  client.subscribe("validation", validation.validation);

  // Git Handler
  const git = new Git(db, integration);
  client.subscribe("firstValidationLinks", git.firstValidationLinks);

  // System Handler
  const system = new System(db, bpmn);
  client.subscribe("suspend", system.suspend);
  client.subscribe("healthCheck", system.healthCheck);
  client.subscribe("updateModelInfo", system.updateModelInfo);
  client.subscribe("endEvent", system.endEvent);
  client.subscribe("bpmnStart", system.bpmnStart);
  client.subscribe("bpmnFinish", system.bpmnFinish);
  client.subscribe("bpmnStatus", system.bpmnStatus);
  client.subscribe("putJobDue", system.putJobDue);
  client.subscribe("needModelOps", system.needModelOps);

  // AutoML Handler
  const automl = new AutoMl(db, integration, bpmn);
  client.subscribe("automl.import", automl.createModel);
  client.subscribe("automl.artefact", automl.addArtefact);
};
