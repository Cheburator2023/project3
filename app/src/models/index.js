const Card = require("./card");
const Task = require("./task");
const User = require("./user");
const Stats = require("./stats");
const Artefact = require("./artefact");
const Instance = require("./instance");
const Integration = require("./integration");
const Report = require("./report");
const Cascade = require("./cascade");
const RiskScale = require("./risk_scale");
const Frame = require("./frame");
const Assignment = require("./assignments");
const ModelRisk = require("./model_risk");
const Allocations = require("./allocation");

module.exports = (db, bpmn, integration) => ({
  card: new Card(db, bpmn, integration),
  task: new Task(db, bpmn, integration),
  user: new User(db, bpmn, integration),
  stats: new Stats(db, bpmn),
  artefact: new Artefact(db),
  instance: new Instance(db, bpmn),
  integration: new Integration(db),
  report: new Report(db, bpmn),
  cascade: new Cascade(db),
  risk_scale: new RiskScale(db),
  assignment: new Assignment(db),
  model_risk: new ModelRisk(db),
  allocations: new Allocations(db),
  // frame: new Frame(db),
  oracle: db,
});
