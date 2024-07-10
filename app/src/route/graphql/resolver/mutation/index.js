const cardMutation = require('./card')
const taskMutation = require('./task')
const artefactMutation = require('./artefact')
const scaleMutation = require('./risk_scale')
const frameMutation = require('./frame')
const assignmentMutation = require('./assignment')
const modelRiskMutation = require('./model_risk')
const allocationsMutation = require('./allocations')

module.exports = {
    ...taskMutation,
    ...cardMutation,
    ...artefactMutation,
    ...scaleMutation,
    ...assignmentMutation,
    ...modelRiskMutation,
    ...allocationsMutation
    // ...frameMutation
}
