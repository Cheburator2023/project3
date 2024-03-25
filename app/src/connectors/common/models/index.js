const sql = require('./sql');

class ModelsService {
  constructor(database, bpmn) {
    this.database = database;
    this.bpmn = bpmn;
  }

  async deleteModel({ modelId }) {
    /* Get all camunda instances for model */
    const processInstanceIds = await this.database.execute({
      sql: sql.getBpmnInstances,
      args: {
        model_id: modelId,
      },
    }).then((data) => data.rows);

    /* Batch delete all instances from camunda */
    if (processInstanceIds.length > 0) {
      await Promise.all(processInstanceIds.map(({ BPMN_INSTANCE_ID }) => {
        return this.bpmn.deleteProcess(BPMN_INSTANCE_ID);
      }));
    }

    /* Delete all records from database */
    await this.database.execute({
      sql: sql.deleteModel,
      args: {
        model_id: modelId,
      },
    });
  }
}

module.exports = ModelsService;
