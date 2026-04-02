const tslgLogger = require('../../../utils/logger');

class Kafka {
  constructor(db, integration) {
    this.db = db;
    this.integration = integration;
  }

    static consoleDebug(...args) {
        const consoleToUse = console.original?.log || console.log;
        consoleToUse('[DEBUG}', ...args);
    }

  kafka_createNewStrategy = async ({ task, taskService }) => {
    const variables = task.variables.getAll();

    tslgLogger.info(`Создание новой стратегии через Kafka`, 'СозданиеСтратегииKafka', {
      modelId: variables.model,
      taskId: task.id
    });

    try {
      const model_entity = await this.db.integration
          .modelGet(variables.model)
          .then((d) => d.rows[0]);

      const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;

      tslgLogger.info(`Отправка сообщения в Kafka для модели ${alias}`, 'ОтправкаKafka', {
        modelId: variables.model,
        alias,
        command: "createNewStrategy"
      });

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

      tslgLogger.info(`Сообщение Kafka отправлено для стратегии: ${alias}`, 'УспехОтправкиKafka', {
        modelId: variables.model,
        alias,
        taskId: task.id
      });

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            const debugMessage = `Ошибка отправки сообщения в Kafka для стратегии: ${variables.model}`;
            const debugData = {
                modelId: variables.model,
                taskId: task.id,
                error: error.message
            };
            Kafka.consoleDebug(debugMessage, debugData);
        }
      throw error;
    }
  };

  createNewModel = async ({ task, taskService }) => {
    const variables = task.variables.getAll();

    tslgLogger.info(`Создание новой модели через Kafka`, 'СозданиеМоделиKafka', {
      modelId: variables.model,
      taskId: task.id
    });

    try {
      const model_entity = await this.db.integration
          .modelGet(variables.model)
          .then((d) => d.rows[0]);

      const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;

      tslgLogger.info(`Отправка сообщения в Kafka для модели ${alias}`, 'ОтправкаKafkaМодель', {
        modelId: variables.model,
        alias,
        command: "createNewModel"
      });

      const status = await this.integration.kafka.message({
        command: "createNewModel",
        modelAlias: alias,
        service: {
          modelName: Buffer.from(model_entity.MODEL_NAME).toString("utf-8"),
          usingMode: Buffer.from(variables.using_mode).toString("utf-8"),
          modelDesc: Buffer.from(model_entity.MODEL_DESC).toString("utf-8"),
          imagePimNexusAddr: Buffer.from(variables.imagePimNexusAddr).toString("utf-8"),
          containerCfgPimNexusAddr: Buffer.from(variables.containerCfgPimNexusAddr).toString("utf-8"),
          modelVersion: model_entity.MODEL_VERSION,
          rootModelId: model_entity.ROOT_MODEL_ID,
          epic: null,
        },
      });

      await taskService.complete(task);

      tslgLogger.info(`Сообщение Kafka отправлено для модели: ${alias}`, 'УспехОтправкиKafkaМодель', {
        modelId: variables.model,
        alias,
        taskId: task.id
      });

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            const debugMessage = `Ошибка отправки сообщения в Kafka для модели: ${variables.model}`;
            const debugData = {
                modelId: variables.model,
                taskId: task.id,
                error: error.message
            };
            Kafka.consoleDebug(debugMessage, debugData);
        }
      throw error;
    }
  };

  archiveModel = async ({ task, taskService }) => {
    const variables = task.variables.getAll();

    tslgLogger.info(`Архивация модели через Kafka`, 'АрхивацияМоделиKafka', {
      modelId: variables.model,
      taskId: task.id
    });

    try {
      const model_entity = await this.db.integration
          .modelGet(variables.model)
          .then((d) => d.rows[0]);

      const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;

      await this.db.card.cancel({ model: variables.model });

      tslgLogger.info(`Модель отмечена как отмененная в БД: ${alias}`, 'ОтменаМоделиБД', {
        modelId: variables.model,
        alias
      });

      // console.sys(`Send msg to Kafka for model ${alias}`);

      // const status = await this.integration
      //     .kafka
      //     .message({
      //         command: "archiveModel",
      //         modelAlias: alias,
      //     })

      await taskService.complete(task);

      tslgLogger.info(`Модель архивирована: ${alias}`, 'УспехАрхивацииМодели', {
        modelId: variables.model,
        alias,
        taskId: task.id
      });

    } catch (error) {
      tslgLogger.error(`Ошибка архивации модели`, 'ОшибкаАрхивацииМодели', error, {
        modelId: variables.model,
        taskId: task.id
      });
      throw error;
    }
  };
}

module.exports = Kafka;
