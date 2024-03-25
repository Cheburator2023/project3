const sql = require('./sql')
const inputArtefact = require('./helpers/inputArtefact')
const artefacts = require('./helpers/artefacts')
const dbVar = require('./helpers/dbVar')
const artefactFilter = require('./helpers/artefactFilter')
const scaleXmodels = require('./helpers/scaleXmodels')

class RiskScale {
  constructor(db) {
    this.db = db
  }

  new = ({ RISK_SCALE_NAME, RISK_SCALE_DESC, VERSION, PARENT_SCALE_ID }) => {
    return this.db
      .execute({
        sql: sql.new,
        args: {
          RISK_SCALE_NAME,
          RISK_SCALE_DESC,
          VERSION,
          PARENT_SCALE_ID
        },
      })
      .then(d => {
        return {
          id: d.rows[0].ROOT_RISK_SCALE_ID
        }
      })
  }

  addArtefacts = ({ ROOT_RISK_SCALE_ID, ARTEFACTS }) => {
    return ARTEFACTS.length > 0
      ? this.db.executeMany({
        sql: sql.add_artefacts,
        args: ARTEFACTS.map(dbVar(ROOT_RISK_SCALE_ID)).filter(
          artefactFilter
        )
      })
        .then(() => true)
        .catch(() => false)
      : true
  }

  link = ({ ROOT_RISK_SCALE_ID, RISK_SCALE_MODELS }) =>
    RISK_SCALE_MODELS.length > 0
      ? this.db.executeMany({
        sql: sql.link,
        args: RISK_SCALE_MODELS.map(scaleXmodels(ROOT_RISK_SCALE_ID))
      })
      : true

  deleteModels = ({ ROOT_RISK_SCALE_ID, RISK_SCALE_MODELS }) =>
    this.db.executeMany({
      sql: sql.delete_model,
      args: RISK_SCALE_MODELS.map(scaleXmodels(ROOT_RISK_SCALE_ID))
    })

  all = () => this.db.execute({ sql: sql.all, args: {} }).then(d => d.rows)

  one = ({ ROOT_RISK_SCALE_ID }) =>
    this.db
      .execute({ sql: sql.one, args: { ROOT_RISK_SCALE_ID } })
      .then(d => {
        return d.rows[0]
      })

  artefacts = ({ ROOT_RISK_SCALE_ID }) =>
    this.db
      .execute({ sql: sql.artefacts, args: { ROOT_RISK_SCALE_ID } })
      .then(d => d.rows)
      .then(d => d.reduce(artefacts.reduce, []).map(artefacts.map))

  inputArtefact = () =>
    this.db
      .execute({
        sql: sql.input_artefact,
        args: {}
      })
      .then(data => data.rows)
      .then(data =>
        data.reduce(inputArtefact.reduce, []).map(inputArtefact.map)
      )

  models = ({ ROOT_RISK_SCALE_ID }, user) => {
    const args = {
      ROOT_RISK_SCALE_ID,
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

  related_models = ({ ROOT_RISK_SCALE_ID }, user) => {
    return this.db.execute({ sql: sql.related_models, args: { ROOT_RISK_SCALE_ID } })
      .then(data => {
        return data.rows
      })
  }

  editArtefact = ({
                    ROOT_RISK_SCALE_ID,
                    ARTEFACT_ID,
                    ARTEFACT_VALUE_ID,
                    ARTEFACT_STRING_VALUE
                  }) =>
    this.db.execute({
      sql: sql.edit_artefact,
      args: {
        ROOT_RISK_SCALE_ID,
        ARTEFACT_ID,
        ARTEFACT_VALUE_ID,
        ARTEFACT_STRING_VALUE
      }
    })

  editName = ({ ROOT_RISK_SCALE_ID, RISK_SCALE_NAME }) =>
    this.db.execute({
      sql: sql.edit_name,
      args: { ROOT_RISK_SCALE_ID, RISK_SCALE_NAME }
    })

  editDesc = ({ ROOT_RISK_SCALE_ID, RISK_SCALE_DESC }) =>
    this.db.execute({
      sql: sql.edit_desc,
      args: { ROOT_RISK_SCALE_ID, RISK_SCALE_DESC }
    })

  editActiveFlg = ({ ROOT_RISK_SCALE_ID, RISK_SCALE_STATUS }) =>
    this.db.execute({
      sql: sql.edit_status,
      args: { ROOT_RISK_SCALE_ID, RISK_SCALE_STATUS }
    })
      .then(() => true)
      .catch(() => false)

  // RANKS
  rank = ({ ROOT_RISK_SCALE_ID }) =>
    this.db.execute({
      sql: sql.rank,
      args: { ROOT_RISK_SCALE_ID }
    })
      .then(data => data.rows)

  addRank = ({ RISK_SCALE_RANKS, ROOT_RISK_SCALE_ID }) => {
    return this.db.executeMany({
      sql: sql.add_rank,
      args: RISK_SCALE_RANKS.map(item => ({
        ...item,
        ROOT_RISK_SCALE_ID
      }))
    })
      .then(() => true)
      .catch(() => false)
  }

  editRank = ({ data }) => {
    delete data.ROOT_RISK_SCALE_ID
    return this.db
      .execute({
        sql: sql.edit_rank,
        args: data
      })
      .then(data => {
        console.log(data)
        return true
      })
      .catch(e => {
        console.log(e)
        return false
      })
  }

  deleteRank = ({ data }) => this.db
    .execute({
      sql: sql.delete_rank,
      args: {
        SYS_SCALE_RANK_ID: data.SYS_SCALE_RANK_ID
      }
    })
    .then(() => true)
    .catch(() => false)
}

module.exports = RiskScale
