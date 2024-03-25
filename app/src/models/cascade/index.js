const sql = require('./sql')

class Cascade {
  constructor(db, bpmn, integration) {
    this.db = db
    this.bpmn = bpmn
    this.integration = integration
    this.sql = sql
  }

}

module.exports = Cascade
