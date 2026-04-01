const { Variables } = require('camunda-external-task-client-js');
const tslgLogger = require('../../../utils/logger');

class AutoMl {
  constructor(db, integration, bpmn) {
    this.db = db;
    this.integration = integration;
    this.bpmn = bpmn;
  }

    static consoleDebug(...args) {
        const consoleToUse = console.original?.log || console.log;
        consoleToUse('[DEBUG}', ...args);
    }

  createModel = async ({ task, taskService }) => {
    const vars = task.variables.getAll();

    /* BASIC VARIABLES */
    const MODEL_DESC = 'AutoML';
    const { modeldev_name } = vars;

    tslgLogger.info(`Импорт модели из системы AutoML. ${modeldev_name}`, 'ИмпортAutoML');

    try {
      /* GET LIST OF ARTEFACTS */
      const artefacts = await this.db.artefact.list();

      /* NEW CAMUNDA INSTANCE */
      const instance = await this.bpmn.start(
          'main',
          JSON.stringify({
            variables: {
              ...artefacts.reduce((prev, a) => ({
                ...prev,
                [a.ARTEFACT_TECH_LABEL]: {
                  value: 'empty',
                },
              }), {}),
              terminate_after_integration: {
                value: true,
              },
            },
          })
      );

      /* FIND ROOT MODEL */
      const rootModel = await this.db.card.autoMLRootModel({
        MODEL_NAME: modeldev_name,
        MODEL_DESC,
      });

      /* INSERT TO DB */
      await this.db.card.new({
        MODEL_ID: instance.id,
        MODEL_NAME: modeldev_name,
        PARENT_MODEL_ID: rootModel,
        MODEL_DESC,
      });

      /* GET MODEL FROM DB */
      const model = await this.db.card.info({
        MODEL_ID: instance.id,
      });
      await this.db.instance.new({
        model: model.MODEL_ID,
        instance: model.MODEL_ID,
        key: 'initialization',
      });

      const alias = `model${model.ROOT_MODEL_ID}-v${model.MODEL_VERSION}`;

      /* CREATE GIT REPO AND PROJECT */
      await this.integration.git.project(alias).catch(() => null);
      await this.integration.git.repo(alias).catch(() => null);

      /* RETURN MODEL_ID TO CAMUNDA */
      const processVariables = new Variables();
      processVariables.setAll({
        model: model.MODEL_ID,
      });

      /* COMPLETE CAMUNDA EXTERNAL TASK */
      await taskService.complete(task, processVariables);

      tslgLogger.info(`Модель AutoML создана успешно: ${alias}`, 'СозданиеAutoML', {
        modelId: model.MODEL_ID,
        alias,
        taskId: task.id
      });

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            const debugMessage = `Ошибка создания модели AutoML: ${modeldev_name} - ${err.message}`;
            const debugData = {
                modeldev_name,
                taskId: task.id
            };
            AutoMl.consoleDebug(debugMessage, debugData);
        }
      throw error;
    }
  };

  addArtefact = async ({ task, taskService }) => {
    const vars = task.variables.getAll();

    /* DB MODEL_ID */
    const { model } = vars;

    tslgLogger.info(`Добавление артефактов к модели: ${model}`, 'ДобавлениеАртефактов', {
      modelId: model,
      taskId: task.id
    });

    try {
      /* INSERT ARTEFACTS */
      /* ARTEFACTS MAPPING */
      const artefactMapping = Object.keys(vars)
          .filter((key) => key !== 'model')
          .map((key) => {
            const [type, tech] = key.split('::');

            /* DROPDOWN VALUE */
            if (tech && type === 'd') {
              return {
                MODEL_ID: model,
                ARTEFACT_TECH_LABEL: tech,
                ARTEFACT_VALUE_ID: vars[key],
                ARTEFACT_STRING_VALUE: null,
              };
            }

            /* ANOTHER TYPE */
            return {
              MODEL_ID: model,
              ARTEFACT_TECH_LABEL: key,
              ARTEFACT_VALUE_ID: null,
              ARTEFACT_STRING_VALUE: vars[key],
            };
          });

      /* MODIFY MAIN PROCESS */
      tslgLogger.info(`Переход бизнес процесса на шаг: integration. Модель: ${model}`, 'ИнтеграцияAutoML', {
        modelId: model,
        artefactsCount: artefactMapping.length
      });

      await this.bpmn.forwardMVP(model, vars);

      /* ADD TECH ARTEFACTS TO DB */
      await this.db.artefact.techAdd(artefactMapping);

      /* COMPLETE CAMUNDA EXTERNAL TASK */
      await taskService.complete(task);

      tslgLogger.info(`Артефакты добавлены к модели: ${model}`, 'УспехДобавленияАртефактов', {
        modelId: model,
        artefactsCount: artefactMapping.length,
        taskId: task.id
      });

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            const debugMessage = `Ошибка добавления артефактов к модели: ${model} - ${err.message}`;
            const debugData = {
                modelId: model,
                taskId: task.id
            };
            AutoMl.consoleDebug(debugMessage, debugData);
        }
      throw error;
    }
  };
}

module.exports = AutoMl;
