const sql = require('./sql')

class ModelRisk {
  constructor(db, bpmn, integration) {
    this.db = db
  }

  all = () => this.db.execute({ sql: sql.all, args: {} }).then(d => d.rows)

  new = ({ AUTHOR, VALUE }) =>
    this.db
      .execute({ sql: sql.new, args: { AUTHOR, VALUE } })
      .then(d => d)
}

module.exports = ModelRisk
