const sql = require('./sql')

class Frame {
  constructor(db) {
    this.db = db
  }

  artefactReduce = artefacts => artefacts.reduce((prev, a) => {
    prev.push(a)
    return prev
  }, [])

  form = id => this.db
    .execute({
      sql: sql.form,
      args: { frame_artefact_id: id }
    })
    .then(data => data.rows)
    .then(this.artefactReduce)

  add = () => []
}

module.exports = Frame
