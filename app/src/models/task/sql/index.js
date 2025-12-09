module.exports = {
  all: require('./all'),
  one: require('./one'),
  model: require('./model'),
  artefact: require('./artefact'),
  artefactUpdate: require('./update'),
  artefactNew: require('./new'),
  allTask: require('./allTask'),
  tasksByIds: require('./tasksByIds'),
  tasksList: require('./tasksList'),
  addOperationLog: require("./addOperationLog"),
  taskOperationsLogs: require("./taskOperationsLogs"),
  tasksOperations: require("./tasksOperations"),
  bpmnKeyByTaskId: require("./bpmnKeyByTaskId"),
  modelStatusAndStageByTask: require("./modelStatusAndStageByTask")
}