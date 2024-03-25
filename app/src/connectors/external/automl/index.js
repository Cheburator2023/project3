const { Variables } = require('camunda-external-task-client-js');

class AutoMl {
  constructor(db, integration, bpmn) {
    this.db = db;
    this.integration = integration;
    this.bpmn = bpmn;
  }

  createModel = async ({ task, taskService }) => {
    const vars = task.variables.getAll();

    /* BASIC VARIABLES */
    const MODEL_DESC = 'AutoML';
    const { modeldev_name } = vars;

    console.info(`Импорт модели из системы AutoML. ${modeldev_name}`);

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
  };

  addArtefact = async ({ task, taskService }) => {
    const vars = task.variables.getAll();

    /* DB MODEL_ID */
    const { model } = vars;

    /* INSERT ARTEFACTS */
    console.info('Добавление артефактов к модели:', model);

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
    console.info('Переход бизнес процеесса на шаг: integration. Модель::', model);
    await this.bpmn.forwardMVP(model, vars);

    /* ADD TECH ARTEFACTS TO DB */
    await this.db.artefact.techAdd(artefactMapping);

    /* COMPLETE CAMUNDA EXTERNAL TASK */
    await taskService.complete(task);
  };
}

module.exports = AutoMl;
