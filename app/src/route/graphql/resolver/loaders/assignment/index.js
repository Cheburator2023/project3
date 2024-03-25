const DataLoader = require('dataloader');

module.exports = (assignment, user) => ({
  assignments: new DataLoader(async (assignmentsIds) => await assignment.assignmentsBatch(assignmentsIds)),
  artefacts: new DataLoader(async (assignmentsIds) => await assignment.artefactsBatch(assignmentsIds)),
  models: new DataLoader(async (assignmentsIds) => await assignment.modelsBatch(assignmentsIds, user)),
});
