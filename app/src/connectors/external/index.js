const client = require("./connector");
const { camundaExternalTaskStatusDecorator, withTracing } = require("../../common/status-helpers");

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
  client.subscribe("jiraIssue", withTracing(jira.issue, "jiraIssue"));
  client.subscribe("jiraStatus", withTracing(jira.status, "jiraStatus"));

  // Teamcity Handler
  const teamcity = new Teamcity(db, integration);
  client.subscribe("teamcity", withTracing(teamcity.main, "teamcity"));
  client.subscribe("publish", camundaExternalTaskStatusDecorator(teamcity.publish, bpmn, db, true));

  // Kafka Handler
  const kafka = new Kafka(db, integration);
  client.subscribe("kafka_createNewModel", withTracing(kafka.createNewModel, "kafka_createNewModel"));
  client.subscribe("kafka_archiveModel", withTracing(kafka.archiveModel, "kafka_archiveModel"));
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
  client.subscribe("suspend", withTracing(system.suspend, "suspend"));
  client.subscribe("healthCheck", withTracing(system.healthCheck, "healthCheck"));
  client.subscribe("updateModelInfo", withTracing(system.updateModelInfo, "updateModelInfo"));
  client.subscribe("endEvent", withTracing(system.endEvent, "endEvent"));
  client.subscribe("bpmnStart", withTracing(system.bpmnStart, "bpmnStart"));
  client.subscribe("bpmnFinish", withTracing(system.bpmnFinish, "bpmnFinish"));
  client.subscribe("bpmnStatus", withTracing(system.bpmnStatus, "bpmnStatus"));
  client.subscribe("putJobDue", camundaExternalTaskStatusDecorator(system.putJobDue, bpmn, db));
  client.subscribe("needModelOps", withTracing(system.needModelOps, "needModelOps"));

  // AutoML Handler
  const automl = new AutoMl(db, integration, bpmn);
  client.subscribe("automl.import", withTracing(automl.createModel, "automl.import"));
  client.subscribe("automl.artefact", withTracing(automl.addArtefact, "automl.artefact"));
};
