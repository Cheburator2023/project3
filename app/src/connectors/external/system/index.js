const moment = require("moment");
const { Variables } = require("camunda-external-task-client-js");
const { model_status } = require("../../../common/status-map");
const { getLastActiveStatus, acquireStageAndStatusFromCamunda } = require("../../../common/status-helpers");
const auditClient = require('../../../utils/audit/auditClient');
const AuditInitiatorHelper = require('../../../utils/audit/auditInitiatorHelper');
const tslgLogger = require('../../../utils/logger');

class System {
  constructor(db, bpmn) {
    this.bpmn = bpmn;
    this.db = db;
  }

    endEvent = async ({task, taskService}) => {
        let correlationId;
        const initiator = AuditInitiatorHelper.build({}, {
            channel: 'service',
            sub: 'system',
            method: 'endEvent',
        });
        try {
            correlationId = await auditClient.start('SUMD_TASKCOMPLETE', initiator, {taskId: task.id});
            tslgLogger.log('info',"Remove parallel call activity","Информация");
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
            tslgLogger.error(`endEvent error: ${error.message}`, 'Ошибка', error, {
                system: 'System',
                task: task,
                status: model_status
            });
        }
    };

    // Update model data in DB
    updateModelInfo = async ({ task, taskService }) => {
        let correlationId;
        const initiator = AuditInitiatorHelper.build({}, {
            channel: 'service',
            sub: 'system',
            method: 'updateModelInfo',
        });
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
            await auditClient.failure('SUMD_CANCELMODEL', correlationId, error, initiator, { modelId: task.variables.get("model") });
            tslgLogger.error(`updateModelInfo error: ${error.message}`, 'Ошибка', error, {
                system: 'System',
                task: task,
                status: model_status
            });
        }
    };

  // Validates the consistency of a model's state between the database and Camunda. Add result to process variables
  healthCheck = async ({ task, taskService }) => {
    tslgLogger.log('info',"Starting health check model...","Информация");

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
      tslgLogger.log('info',"Starting suspending model...","Информация");

      const { model } = task.variables.getAll();

      await this.bpmn.toggleModelSuspension({
        modelId: model,
        suspended: true,
      });

      await taskService.complete(task);
    } catch (error) {
        tslgLogger.error(`Suspend error: ${error.message}`, 'Ошибка', error, {
            system: 'System',
            task: task,
            status: model_status
        });
    }
  };

  bpmnStart = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    tslgLogger.log('info',"Инициализация Бизнес процесса","Информация");

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
    } catch (error) {
      tslgLogger.error(`bpmnStart error: ${error.message}`, 'Ошибка', error, {
          system: 'System',
          task: task,
          status: model_status
      });
    }
  };

    /**
     * Завершает бизнес-процесс в Camunda, обновляет статус и этап модели в БД,
     * отправляет аудит. Обрабатывает ошибки и гарантирует наличие traceId/spanId.
     */
    bpmnFinish = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        tslgLogger.log('info',"Завершение Бизнес процесса","Информация");
        let correlationId;
        const initiator = AuditInitiatorHelper.build({}, {
            channel: 'service',
            sub: 'system',
            method: 'bpmnFinish',
        });

        try {
            // Явно извлекаем modelId с проверкой на undefined
            const modelId = variables?.model;
            if (!modelId) {
                throw new Error('Model ID is missing in task variables');
            }

            // Старт аудита с передачей modelId и taskId
            correlationId = await auditClient.start('SUMD_TASKCOMPLETE', initiator, {
                modelId: modelId,
                taskId: task.id
            });

            // Завершаем инстанс в БД
            await this.db.instance.finish({
                model: modelId,
                instance: task.processInstanceId,
                key: variables.key,
            });

            // Завершаем задачу в Camunda
            await taskService.complete(task);

            // Получаем статус и этап из Camunda (или маппинга)
            const { modelStage, modelStatus } = await acquireStageAndStatusFromCamunda(
                task.id,
                task.activityId,
                task.processDefinitionId,
                variables,
                {
                    bpmn: this.bpmn,
                    db: this.db,
                },
            );

            // Обновляем этап модели (удаляем завершённый этап)
            if (modelStage) {
                await this.db.card.removeStage({
                    modelId: modelId,
                    modelStage: modelStage,
                });
            }

            // Обновляем статус модели
            if (modelStatus) {
                await this.db.card.changeStatus({
                    modelId: modelId,
                    modelStatus: modelStatus,
                });
                // проставляем флаг активности если модель перешла в архив (для моделей со статусом из камунды)
                if (modelStatus === 'Архив') {
                    await this.db.card.editActiveStatus({ MODEL_ID: modelId, MODELS_IS_ACTIVE_FLG: 0 });
                }
            } else {
                // Если статус не получен из Camunda, проверяем артефакты
                const currentModelStatus = await this.db.card.getCurrentModelStatus(modelId);
                if (currentModelStatus?.artefacts_model_status?.split(';').includes('Архив')) {
                    await this.db.card.editActiveStatus({ MODEL_ID: modelId, MODELS_IS_ACTIVE_FLG: 0 });
                }
            }

            // Успешное завершение – аудит SUCCESS
            await auditClient.success('SUMD_TASKCOMPLETE', correlationId, initiator, {
                modelId: modelId,
                taskId: task.id
            });

        } catch (error) {
            // Обработка ошибки: отправка FAILURE с fallback-значением modelId
            const modelId = variables?.model || 'unknown';
            await auditClient.failure('SUMD_TASKCOMPLETE', correlationId, error, initiator, {
                modelId: modelId,
                taskId: task.id,
                error: error.message,
            });
            tslgLogger.error(`bpmnFinish error: ${error.message}`, 'Ошибка', error,{
                system: 'System',
                task: task,
                status: model_status
                });
            // Ошибка НЕ пробрасывается дальше, чтобы external task не зависал
        }
    };

  bpmnStatus = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    tslgLogger.log('info',"Смена статуса модели","Информация");
    try {
      if ("model_status" in variables) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: variables.model_status ? variables.model_status : null,
        });
      }
      await taskService.complete(task);
    } catch (error) {
      tslgLogger.error(`bpmnFinish error: ${error.message}`, 'Ошибка', error,{
          system: 'System',
          task: task,
          status: model_status
      });
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
    } catch (error) {
        tslgLogger.error(`putJobDue error: ${error.message}`, 'Ошибка', error,{
            system: 'System',
            task: task,
            status: model_status
        });
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
    } catch (error) {
        tslgLogger.error(`needModelOps error: ${error.message}`, 'Ошибка', error,{
            system: 'System',
            task: task,
            status: model_status
        });
    }
  };
}

module.exports = System;
