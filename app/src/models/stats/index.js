const sql = require('./sql')

class Stats {
  constructor(db, bpmn) {
    this.db = db
    this.bpmn = bpmn
  }

  model = () => this.db
    .execute({
      sql: sql.model,
      args: {}
    })
    .then(data => data.rows)

  task = async user => {
    const camundaTasks = await this.bpmn.tasks(user.groups);
    const idxbpmn = camundaTasks.map(t => t.processInstanceId);

    return this.db
      .execute({
        sql: sql.task,
        args: {
          idxbpmn
        }
      })
      .then(data => data.rows)
  }
}

module.exports = Stats
