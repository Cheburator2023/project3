const sql = require("./sql");
const artefactReduce = require("./helpers/artefactReduce");
const dbVar = require("./helpers/dbVar");
const artefactFilter = require("./helpers/artefactFilter");
const { mergeHistoryData, isArtefactSynced, getSumrmArtefactId } = require("./helpers/historyMerger");
const { SYNC_CONFIG } = require("../../common/sumrmConfig");

class Artefact {
  constructor(db, integration = null) {
    this.db = db;
    this.integration = integration;
  }

  list = () =>
    this.db.execute({ sql: sql.list, args: {} }).then((data) => data.rows);

  all = () =>
    this.db
      .execute({ sql: sql.all, args: {} })
      .then((data) => data.rows)
      .then(artefactReduce);

  specific = (args) =>
    this.db
      .execute({
        sql: sql.specific,
        args,
      })
      .then((data) => data.rows);

  type = () =>
    this.db.execute({ sql: sql.type, args: {} }).then((data) => data.rows);

  departament = () =>
    this.db
      .execute({ sql: sql.departament, args: {} })
      .then((data) => data.rows)
      .then(artefactReduce)
      .then((d) => d[0]);

  classificators = () =>
    this.db
      .execute({ sql: sql.classes, args: {} })
      .then((data) => data.rows)
      .then(artefactReduce);

  artefactById = ({ artefactId }) =>
    this.db
      .execute({ sql: sql.artefactById, args: { artefactId } })
      .then((data) => {
        return data.rows;
      })
      .then((data) => artefactReduce(data)[0]);

  artefactRealizationById = ({ artefactId, modelId }) =>
    this.db
      .execute({
        sql: sql.artefactRealizationById,
        args: { artefactId, modelId },
      })
      .then(({ rows }) => rows[0]);

  update = (args) => this.db.execute({ sql: sql.update, args });

  add = ({ MODEL_ID, ARTEFACTS }) =>
    ARTEFACTS.length > 0
      ? this.db.executeMany({
        sql: sql.new,
        args: ARTEFACTS.map(dbVar(MODEL_ID)).filter(artefactFilter),
      })
      : true;

  techAdd = (ARTEFACTS) =>
    ARTEFACTS.length > 0
      ? this.db
        .executeMany({
          sql: sql.techAdd,
          args: ARTEFACTS,
        })
        .then((data) => {
          console.log(data);
        })
      : true;

  copy = async ({ PARENT_MODEL_ID, MODEL_ID }) => {
    const parentArtefacts = await this.db
      .execute({
        sql: `SELECT * FROM ARTEFACT_REALIZATIONS WHERE MODEL_ID = :PARENT_MODEL_ID  AND EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')`,
        args: { PARENT_MODEL_ID },
      })
      .then((data) => data.rows);
    return this.add({ MODEL_ID, ARTEFACTS: parentArtefacts });
  };

  editArtefact = (args) =>
    this.db.execute({
      sql: sql.editArtefact,
      args: {
        ARTEFACT_ID: null,
        ARTEFACT_TECH_LABEL: null,
        ARTEFACT_LABEL: null,
        ARTEFACT_DESC: null,
        ARTEFACT_TYPE_ID: null,
        IS_MAIN_INFO_FLG: null,
        IS_CLASS_FLG: null,
        IS_EDIT_FLG: null,
        ...args,
      },
    });

  editArtefactValue = (args) =>
    this.db.executeMany({
      sql: sql.editArtefactValue,
      args,
    });

  history = async (args, user = null) => {
    const { MODEL_ID, ARTEFACT_ID } = args;
    
    // Helper method to get local history
    const getLocalHistory = () => 
      this.db
        .execute({
          sql: sql.history,
          args: { MODEL_ID, ARTEFACT_ID },
        })
        .then((d) => d.rows);
    
    // Check if this artefact should be synchronized with SumRM
    const shouldSync = SYNC_CONFIG.enabled && 
                      SYNC_CONFIG.historyEnabled && 
                      isArtefactSynced(ARTEFACT_ID) && 
                      this.integration?.sumrm;
    
    if (!shouldSync) {
      // Use existing logic for non-synced artefacts
      return getLocalHistory();
    }
    
    try {
      // Get local history
      const localHistory = await getLocalHistory();
      
      // Get SumRM history
      const sumrmArtefactId = getSumrmArtefactId(ARTEFACT_ID);
      const sumrmHistory = await this.integration.sumrm.getArtefactHistory(
        MODEL_ID, 
        sumrmArtefactId, 
        user?.token // Use user token if available
      );
      
      if (sumrmHistory === null) {
        console.sys('SUMRM', `[WARNING] Failed to fetch SumRM history for artefact ${ARTEFACT_ID}, using local data only`)
        return localHistory;
      }
      
      // Merge local and SumRM history
      const mergedHistory = mergeHistoryData(localHistory, sumrmHistory);
      
      console.sys('SUMRM', `[INFO] Merged history for artefact ${ARTEFACT_ID}: ${localHistory.length} local + ${sumrmHistory.length} SumRM = ${mergedHistory.length} total records`)
      
      return mergedHistory;
      
    } catch (error) {
      console.sys('SUMRM', `[ERROR] Failed to merge history for artefact ${ARTEFACT_ID}:`, error.message)
      // Fallback to local data only
      return getLocalHistory();
    }
  };

  possibleValues = ({ ARTEFACT_ID }) =>
    this.db
      .execute({ sql: sql.possibleValues, args: { ARTEFACT_ID } })
      .then((d) => d.rows);

  getArtefactValueIdByValue = ({ artefactId, value }) =>
    this.db
      .execute({ sql: sql.getArtefactValueIdByValue, args: { artefact_id: artefactId, value }})
      .then((d) => d.rows[0] ? d.rows[0] : null);
}

module.exports = Artefact;
