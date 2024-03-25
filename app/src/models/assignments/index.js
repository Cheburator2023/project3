const sql = require('./sql')
const inputArtefact = require('./helpers/inputArtefact')
const dbVar = require('./helpers/dbVar')
const artefactFilter = require('./helpers/artefactFilter')
const models = require('./helpers/models')
const artefacts = require('./helpers/artefacts')
const assignments = require('./helpers/assignments')
const scaleXmodels = require('./helpers/scaleXmodels')


class Assignment {
  constructor(db) {
    this.db = db
  }

  all = () => this.db.execute({ sql: sql.all, args: {} }).then(d => d.rows)

  assignments = ({ ROOT_ASSIGNMENT_ID }) =>
    this.db
      .execute({ sql: sql.assignments, args: { ROOT_ASSIGNMENT_ID: ROOT_ASSIGNMENT_ID } })
      .then(d => d.rows)

  assignmentsBatch = (assignmentsIds) => {
    const { getArguments, groupResponse } = assignments;

    return this.db
      .execute({
        sql: sql.assignmentsBatch,
        args: getArguments(assignmentsIds)
      })
      .then(d => groupResponse(d.rows, assignmentsIds))
  }

  one = ({ ASSIGNMENT_ID }) =>
    this.db
      .execute({ sql: sql.one, args: { ASSIGNMENT_ID: ASSIGNMENT_ID } })
      .then(d => {
        return d.rows[0]
      })

  root = ({ ROOT_ASSIGNMENT_ID }) =>
    this.db
      .execute({ sql: sql.root, args: { ROOT_ASSIGNMENT_ID: ROOT_ASSIGNMENT_ID } })
      .then(d => {
        return d.rows[0]
      })

  addArtefacts = ({ ASSIGNMENT_ID, ARTEFACTS }) => {
    return ARTEFACTS.length > 0
      ? this.db.executeMany({
        sql: sql.addArtefacts,
        args: ARTEFACTS.map(dbVar(ASSIGNMENT_ID)).filter(
          artefactFilter
        )
      })
      : true
  }

  new = ({ ROOT_ASSIGNMENT_ID }) => {
    return this.db
      .execute({
        sql: sql.new,
        args: {
          ROOT_ASSIGNMENT_ID
        }
      })
      .then(d => ({
        id: d.rows[0].ID
      }))
  }

  newRoot = ({ END_DATE, END_EVENT }) => {
    return this.db
      .execute({
        sql: sql.newRoot,
        args: {
          END_DATE,
          END_EVENT
        },
      })
      .then(d => ({
        id: d.rows[0].ID
      }))
  }

  edit = ({ ROOT_ASSIGNMENT_ID }) => {
    return this.db
      .execute({
        sql: sql.edit,
        args: {
          ROOT_ASSIGNMENT_ID
        }
      })
      .then(d => ({
        id: d.rows[0].ID
      }))
  }

  updateStatus = ({ ROOT_ASSIGNMENT_ID, STATUS }) =>
    this.db
      .execute({ sql: sql.updateStatus, args: { ID: ROOT_ASSIGNMENT_ID, STATUS: STATUS } })
      .then(d => d)

  inputArtefacts = ({ TASK_ID }) =>
    this.db
      .execute({
        sql: sql.inputArtefacts,
        args: { TASK_ID }
      })
      .then(data => data.rows)
      .then(data =>
        data.reduce(inputArtefact.reduce, []).map(inputArtefact.map)
      )

  artefacts = ({ ASSIGNMENT_ID }) =>
    this.db
      .execute({ sql: sql.artefacts, args: { ASSIGNMENT_ID } })
      .then(d => d.rows)
      .then(d => d.reduce(artefacts.reduce, []).map(artefacts.map))

  artefactsBatch = (assignmentsIds) => {
    const { getArguments, groupResponse } = artefacts;

    return this.db
      .execute({ sql: sql.artefactsBatch, args: getArguments(assignmentsIds) })
      .then(d => groupResponse(d.rows, assignmentsIds))
  }

  updateAssignment = ({ ROOT_ASSIGNMENT_ID }) => {
    return this.db
      .execute({
        sql: sql.updateAssignment,
        args: {
          ROOT_ASSIGNMENT_ID
        }
      })
      .then(d => ({
        id: d.rows[0]
      }))
  }

  updateArtefacts = (ASSIGNMENT_ID) =>
    this.db
      .execute({
        sql: sql.updateArtefacts,
        args: { ASSIGNMENT_ID: ASSIGNMENT_ID }
      })

  link = ({ ROOT_ASSIGNMENT_ID, MODELS }) =>
    MODELS.length > 0
      ? this.db.executeMany({
        sql: sql.link,
        args: MODELS.map(scaleXmodels(ROOT_ASSIGNMENT_ID))
      })
      : true

  models = (root, user) => {
    const args = {
      ID: root.ID,
      type: 'initialization',
      active: '1',
      groups: user.groups.join(','),
      is_ds_flg: user.groups.includes('ds') ? '1' : '0',
      is_bc_flg: user.groups.includes('business_customer') ? '1' : '0'
    }
    return this.db.execute({ sql: sql.models, args }).then(d => {
      return d.rows
    })
  }

  modelsBatch = (assignmentsIds, user) => {
    const { getArguments, groupResponse } = models;

    return this.db.execute({
      sql: sql.modelsBatch,
      args: getArguments(assignmentsIds, user)
    }).then(d => groupResponse(d.rows, assignmentsIds))
  }

  updateModels = ({ ROOT_ASSIGNMENT_ID }) =>
    this.db.execute({
      sql: sql.updateModels,
      args: { ROOT_ASSIGNMENT_ID }
    })

  editArtefact = ({
                    ASSIGNMENT_ID,
                    ARTEFACT_ID,
                    ARTEFACT_VALUE_ID,
                    ARTEFACT_STRING_VALUE,
                    ARTEFACT_ORIGINAL_VALUE
                  }) =>
    this.db.execute({
      sql: sql.editArtefact,
      args: {
        ASSIGNMENT_ID,
        ARTEFACT_ID,
        ARTEFACT_VALUE_ID,
        ARTEFACT_STRING_VALUE,
        ARTEFACT_ORIGINAL_VALUE
      }
    })

  filledArtefact = ({ ARTEFACT_ID }) =>
    this.db.execute({
      sql: sql.filledArtefact,
      args: { ARTEFACT_ID }
    })
      .then(d => d.rows)
      .then(d => d.map(a => a.ARTEFACT_STRING_VALUE))
}

module.exports = Assignment
