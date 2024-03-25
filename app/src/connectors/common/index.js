const ModelsService = require('./models');
const AssignmentsService = require('./assignments');

module.exports = (database, bpmn) => ({
  models: new ModelsService(database, bpmn),
  assignments: new AssignmentsService(database),
});
