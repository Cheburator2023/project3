const moment = require("moment");
const { Variables } = require("camunda-external-task-client-js");
const { model_status } = require("../../../common/status-map");
const { getLastActiveStatus, acquireStageAndStatusFromCamunda } = require("../../../common/status-helpers");
const auditClient = require('../../../utils/audit/auditClient');
const tslgLogger = require('../../../utils/logger');

class System {
  constructor(db, bpmn) {
    this.bpmn = bpmn;
    this.db = db;
  }

    endEvent = async ({task, taskService}) => {
        let correlationId;
        const initiator = {sub: 'system', channel: 'system', method: 'endEvent'};
        try {
            correlationId = await auditClient.start('SUMD_TASKCOMPLETE', initiator, {taskId: task.id});
            console.log("Remove parallel call activity");
            const instance = task.variables.get("instance");
            const processInstances = await this.bpmn.processInstances();
            const process = processInstances.find(
                (i) =>
                    i.rootProcessInstanceId == instance &&
                    (i.processDefinitionKey == "monitoring" ||
                        i.processDefinitionKey == "validation")
            );
            console.log(JSON.stringify(process));
            await this.bpmn.deleteProcess(process.id);
            await taskService.complete(task);
            await auditClient.success('SUMD_TASKCOMPLETE', correlationId, initiator, {taskId: task.id});
        } catch (error) {
            await auditClient.failure('SUMD_TASKCOMPLETE', correlationId, error, initiator, {taskId: task.id});
            tslgLogger.sys(error);
        }
    };

    // Update model data in DB
    updateModelInfo = async ({ task, taskService }) => {
        let correlationId;
        const initiator = { sub: 'system', channel: 'system', method: 'updateModelInfo' };
        try {
            const { model, model_stage } = task.variables.getAll();
            correlationId = await auditClient.start('SUMD_CANCELMODEL', initiator, { modelId: model });

            // Set model_is_active_flg to 0 in models table
            await this.db.card.cancel({ model });

            // Replace all stages, including parallel ones, with the current stage
            await this.db.card.changeStage({
                modelId: model,
                modelStage: model_stage ? model_stage : null,
            });

            await taskService.complete(task);
            await auditClient.success('SUMD_CANCELMODEL', correlationId, initiator, { modelId: model });
        } catch (error) {
            await auditClient.failure('SUMD_CANCELMODEL', correlationId, e, initiator, { modelId: task.variables.get("model") });
            tslgLogger.sys(error);
        }
    };

  // Validates the consistency of a model's state between the database and Camunda. Add result to process variables
  healthCheck = async ({ task, taskService }) => {
    console.log("Starting health check model...");

    const { model } = task.variables.getAll();

    const modelValidationResult =
      await this.db.card.validateModelStateConsistency(model);

    const processVariables = new Variables();

    if (modelValidationResult.error) {
      processVariables.setAll({
        is_healthy: false,
        healthy_error: modelValidationResult.errorMessage,
      });
    } else {
      processVariables.setAll({
        is_healthy: true,
        healthy_error: "",
      });
    }

    await taskService.complete(task, processVariables);
  };

  // Suspend all active process instances
  suspend = async ({ task, taskService }) => {
    try {
      console.log("Starting suspending model...");

      const { model } = task.variables.getAll();

      await this.bpmn.toggleModelSuspension({
        modelId: model,
        suspended: true,
      });

      await taskService.complete(task);
    } catch (e) {
      console.error(e);
    }
  };

  bpmnStart = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.sys("Инициализация Бизнес процесса");

    try {
      const checkInstance = await this.db.instance.id(task.processInstanceId);

      if (checkInstance) {
        await taskService.complete(task);
        return;
      }

      await this.db.instance.key({
        model: variables.model,
        key: variables.key,
      });
      await this.db.instance.new({
        model: variables.model,
        instance: task.processInstanceId,
        key: variables.key,
      });
      await taskService.complete(task);

      const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
        task.id,
        task.activityId,
        task.processDefinitionId,
        variables,
        {
          bpmn: this.bpmn,
          db: this.db,
        },
      );

      await this.db.card.addStage({
        modelId: variables.model,
        modelStage: modelStage,
      });
      if (modelStatus) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: modelStatus ? modelStatus : null,
        });
      }
    } catch (e) {
      console.sys(e);
    }
  };

  bpmnFinish = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.sys("Завершение Бизнес процесса");
      let correlationId;
      const initiator = { sub: 'system', channel: 'system', method: 'bpmnFinish' };
      try {
          correlationId = await auditClient.start('SUMD_TASKCOMPLETE', initiator, { modelId: variables.model });
          await this.db.instance.finish({
        model: variables.model,
        instance: task.processInstanceId,
        key: variables.key,
      });
      await taskService.complete(task);

      const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
        task.id,
        task.activityId,
        task.processDefinitionId,
        variables,
        {
          bpmn: this.bpmn,
          db: this.db,
        },
      );

      await this.db.card.removeStage({
        modelId: variables.model,
        modelStage: modelStage,
      });
      if (modelStatus) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: modelStatus ? modelStatus : null,
        });
        // проставляем флаг активности если модель перешла в архив (для моделей со статусом из камунды)
        if (modelStatus === 'Архив') {
          await this.db.card.editActiveStatus({MODEL_ID: variables.model, MODELS_IS_ACTIVE_FLG: 0});
        }
      } else {
        const model = await this.db.card.getCurrentModelStatus(model);
        // проставляем флаг активности если модель перешла в архив (для моделей со статусом по артефактам)
        if (model.artefacts_model_status && model.artefacts_model_status.split(';').includes('Архив')) {
          await this.db.card.editActiveStatus({MODEL_ID: variables.model, MODELS_IS_ACTIVE_FLG: 0});
        }
      }
          await auditClient.success('SUMD_TASKCOMPLETE', correlationId, initiator, { modelId: variables.model });
      } catch (error) {
          await auditClient.failure('SUMD_TASKCOMPLETE', correlationId, error, initiator, {
              modelId: variables.model,
              error: error.message
          });
          tslgLogger.sys(error);
      }
    };

  bpmnStatus = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.sys("Смена статуса модели");
    try {
      if ("model_status" in variables) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: variables.model_status ? variables.model_status : null,
        });
      }
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };

  putJobDue = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    try {
      const job = await this.bpmn.getJobByProcessInstanceId(variables.instance);
      if (job.length > 0)
        await this.bpmn.putJobDue(
          job[0].id,
          moment(variables.date_completing_ds_tests).format(
            "YYYY-MM-DDTHH:mm:ss.000+0000"
          )
        );
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };

  /**
   * External Task Worker for process: model_state_transition
   * Topic: model_state_transition.needModelOps
   *
   * Purpose:
   *   Determines if ModelOps involvement is required when archiving a model.
   */
  needModelOps = async ({ task, taskService }) => {
    const variables = task.variables.getAll();

    try {
      const processVariables = new Variables();

      const { CAMUNDA_MODEL_STATUS, ARTEFACTS_MODEL_STATUS } = await this.db.card.getCurrentModelStatus(variables.model)
      const status = CAMUNDA_MODEL_STATUS || getLastActiveStatus(ARTEFACTS_MODEL_STATUS)
      const filteredValues = [
        model_status.developed_not_implemented,
        model_status.validated_outside_pim,
        model_status.implemented_outside_pim,
        model_status.implementing_outside_pim
      ]

      processVariables.setAll({
        need_model_ops: !filteredValues.includes(status)
      });
      await taskService.complete(task, processVariables);
    } catch (e) {
      console.sys(e);
    }
  };
}

module.exports = System;
