const client = require("./connector");
const {camundaExternalTaskStatusDecorator} = require("../../common/status-helpers");

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
  client.subscribe("publish", camundaExternalTaskStatusDecorator(teamcity.publish, bpmn, db, true));

  // Kafka Handler
  const kafka = new Kafka(db, integration);
  client.subscribe("kafka_createNewModel", kafka.createNewModel);
  client.subscribe("kafka_archiveModel", kafka.archiveModel);
  client.subscribe("kafka_createNewStrategy", camundaExternalTaskStatusDecorator(kafka.kafka_createNewStrategy, bpmn, db));

  // Mail Handler
  const mail = new Mail(db, integration);
  client.subscribe("mail", camundaExternalTaskStatusDecorator(mail.main, bpmn, db));

  // Database Handler
  const database = new Database(db, integration);
  client.subscribe("artefacts", camundaExternalTaskStatusDecorator(database.artefacts, bpmn, db));

  // Validation Handler
  const validation = new Validation(db, integration);
  client.subscribe("validation", camundaExternalTaskStatusDecorator(validation.validation, bpmn, db));

  // Git Handler
  const git = new Git(db, integration);
  client.subscribe("firstValidationLinks", camundaExternalTaskStatusDecorator(git.firstValidationLinks, bpmn, db));

  // System Handler
  const system = new System(db, bpmn);
  client.subscribe("suspend", system.suspend);
  client.subscribe("healthCheck", system.healthCheck);
  client.subscribe("updateModelInfo", system.updateModelInfo);
  client.subscribe("endEvent", system.endEvent);
  client.subscribe("bpmnStart", system.bpmnStart);
  client.subscribe("bpmnFinish", system.bpmnFinish);
  client.subscribe("bpmnStatus", system.bpmnStatus);
  client.subscribe("putJobDue", camundaExternalTaskStatusDecorator(system.putJobDue, bpmn, db));
  client.subscribe("needModelOps", system.needModelOps);

  // AutoML Handler
  const automl = new AutoMl(db, integration, bpmn);
  client.subscribe("automl.import", automl.createModel);
  client.subscribe("automl.artefact", automl.addArtefact);
};
