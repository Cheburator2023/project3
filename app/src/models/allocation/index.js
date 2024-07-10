const sql = require("./sql");

class Allocation {
  constructor(db) {
    this.db = db;
  }

  async getAllocations() {
    const result = await this.db.execute({ sql: sql.getAllocations, args: {} });
    return result.rows;
  }

  async getUsage({ model_id }) {
    const result = await this.db.execute({ sql: sql.getUsage, args: { model_id } });
    return result.rows;
  }

  async getUsageHistory(args) {
    const result = await this.db.execute({ sql: sql.getUsageHistory, args });
    return result.rows;
  }

  async updateUsage({ MODEL_ID, DATA }) {
    const args = DATA.map(item => ({
      MODEL_ID,
      ALLOCATION_ID: item.ALLOCATION_ID,
      PERCENTAGE: item.PERCENTAGE !== undefined ? item.PERCENTAGE : null,
      COMMENT: item.COMMENT !== undefined ? item.COMMENT : null
    }));

    const dataArr = await this.db.executeMany({ sql: sql.updateUsage, args });
    return dataArr.map(data => data.rows[0]);
  }

  async updateUsageHistory(data, user) {
    const args = data.map(item => ({
      ...item,
      CREATOR_FULL_NAME: user.name
    }));

    const dataArr = await this.db.executeMany({ sql: sql.updateUsageHistory, args });
    return dataArr.map(data => data.rows[0]);
  }

  async getModelUsageConfirmation({ model_id }) {
    const result = await this.db.execute({ sql: sql.getModelUsageConfirmation, args: { model_id } });

    return result.rows
  }

  async updateModelUsageConfirmation({ MODEL_ID, DATA }) {
    const args = DATA.map(item => ({
      CONFIRMATION_DATE: null,
      MODEL_ID,
      ...item
    }));


    const dataArr = await this.db.executeMany({ sql: sql.updateModelUsageConfirmation, args });
    return dataArr.map(data => data.rows[0]);
  }

  async updateModelUsageConfirmationHistory({ DATA, USER}) {
    const args = DATA.map(item => ({
      CREATOR_FULL_NAME: USER.name,
      ...item
    }));

    const dataArr = await this.db.executeMany({ sql: sql.updateModelUsageConfirmationHistory, args });
    return dataArr.map(data => data.rows[0]);
  }

  async getModelUsageConfirmationHistory(args) {
    const result = await this.db.execute({ sql: sql.getModelUsageConfirmationHistory, args });
    return result.rows;
  }
}

module.exports = Allocation;
