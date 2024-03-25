const sql = require('./sql')

class Integration {
  constructor(db) {
    this.db = db
  }

  modelGet = id => this.db.execute({
    sql: sql.model,
    args: { MODEL_ID: id }
  })

  modelLinks = id => this.db.execute({
    sql: sql.modelLinks,
    args: { MODEL_ID: id }
  })

  modelClassificators = id => this.db.execute({
    sql: sql.classificators,
    args: { MODEL_ID: id }
  })

  artefactValues = (id, artefactId) => this.db.execute({
    sql: sql.artefactValues,
    args: { MODEL_ID: id, ARTEFACT_ID: artefactId }
  })

  jiraGet = instance => this.db.execute({
    sql: sql.one,
    args: { INSTANCE_ID: instance }
  })

  artefactId = artefactLabel => this.db.execute({
    sql: sql.artefactId,
    args: { ARTEFACT_TECH_LABEL: artefactLabel }
  })

  jiraAdd = (jiraReponse, instance, status, epic_name, story_summary) => this.db.execute({
    sql: sql.add,
    args: {
      JIRA_RESPONSE: jiraReponse,
      INSTANCE_ID: instance,
      JIRA_STATUS: status,
      EPIC_NAME: epic_name,
      STORY_SUMMARY: story_summary
    }
  })
}

module.exports = Integration
