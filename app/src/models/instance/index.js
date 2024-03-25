const sql = require('./sql')

class Instance {
  constructor(db) {
    this.db = db
  }

  id = id => this.db
    .execute({
      sql: sql.id,
      args: { id }
    })
    .then(d => d.rows.length > 0)

  info = ({ processInstanceId }) => this.db
    .execute({
      sql: sql.info,
      args: { processInstanceId }
    })
    .then(d => d.rows)

  model = ({ model }) => this.db
    .execute({
      sql: sql.model,
      args: { model }
    })
    .then(d => d.rows)

  check = ({ model, key }) => {
    return this.db
      .execute({
        sql: sql.check,
        args: { model, key }
      })
      .then(d => d.rows)
  }

  update = ({ model, key }) => this.db
    .execute({
      sql: sql.version,
      args: { model, key }
    })

  deleteBpmnInstance = (bpmnIds) => this.db
    .execute({
      sql: sql.deleteBpmnInstance,
      args: {
        bpmnIds,
      }
    })

  new = ({ model, instance, key }) => this.db
    .execute({
      sql: sql.new,
      args: { model, instance, key }
    })

  key = ({ model, key }) => this.db
    .execute({
      sql: sql.key,
      args: { model, key }
    })

  finish = ({ model, instance, key }) => this.db
    .execute({
      sql: sql.update,
      args: { model, instance }
    })

  getInstancesByModelId = modelId => this.db
    .execute({
      sql: sql.instancesByModelId,
      args: { modelId }
    })
    .then(d => d.rows)

  rollback = () => {
  }
}

module.exports = Instance
