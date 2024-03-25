class Kafka {
  constructor(db, integration) {
    this.db = db;
    this.integration = integration;
  }

  kafka_createNewStrategy = async ({ task, taskService }) => {
    try {
      const variables = task.variables.getAll();
      const model_entity = await this.db.integration
        .modelGet(variables.model)
        .then((d) => d.rows[0]);
      const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;
      console.sys(`Send msg to Kafka for model ${alias}`);
      const status = await this.integration.kafka.message({
        command: "createNewStrategy",
        modelAlias: alias,
        service: {
          modelName: Buffer.from(model_entity.MODEL_NAME).toString("utf-8"),
          usingMode: Buffer.from(variables.using_mode).toString("utf-8"),
          modelDesc: Buffer.from(model_entity.MODEL_DESC).toString("utf-8"),
          modelVersion: model_entity.MODEL_VERSION,
          rootModelId: model_entity.ROOT_MODEL_ID,
          epic: null,
        },
      });
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };

  createNewModel = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    try {
      const model_entity = await this.db.integration
        .modelGet(variables.model)
        .then((d) => d.rows[0]);
      const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;
      console.sys(`Send msg to Kafka for model ${alias}`);
      const status = await this.integration.kafka.message({
        command: "createNewModel",
        modelAlias: alias,
        service: {
          modelName: Buffer.from(model_entity.MODEL_NAME).toString("utf-8"),
          usingMode: Buffer.from(variables.using_mode).toString("utf-8"),
          modelDesc: Buffer.from(model_entity.MODEL_DESC).toString("utf-8"),
          imagePimNexusAddr: Buffer.from(variables.imagePimNexusAddr).toString(
            "utf-8"
          ),
          containerCfgPimNexusAddr: Buffer.from(
            variables.containerCfgPimNexusAddr
          ).toString("utf-8"),
          //dockerCfgPimNexusAddr: variables.dockerCfgPimNexusAddr,
          modelVersion: model_entity.MODEL_VERSION,
          rootModelId: model_entity.ROOT_MODEL_ID,
          epic: null,
        },
      });
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };

  archiveModel = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.log(variables);
    try {
      const model_entity = await this.db.integration
        .modelGet(variables.model)
        .then((d) => d.rows[0]);
      const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;

      await this.db.card.cancel({ model: variables.model });

      // console.sys(`Send msg to Kafka for model ${alias}`);

      // const status = await this.integration
      //     .kafka
      //     .message({
      //         command: "archiveModel",
      //         modelAlias: alias,
      //     })
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };
}

module.exports = Kafka;
