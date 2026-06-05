const { status, model_status } = require("./status-map");

const getLastActiveStatus = (activeStatuses) => {
  const activeStatusesList = activeStatuses?.split(";");

  if (activeStatusesList?.includes(model_status.removed_from_operation)) {
    return model_status.removed_from_operation;
  }

  if (activeStatusesList?.includes(model_status.developed_not_implemented)) {
    return model_status.developed_not_implemented;
  }

  return activeStatusesList?.[0];
};

const hasSpecificArtefactValue = (artefacts, artefactId, artefactValueId) => {
  return artefacts.some((artefact) => {
    return (
      artefact.ARTEFACT_ID === artefactId &&
      artefact.VALUES.some(
        (value) => value.ARTEFACT_VALUE_ID === artefactValueId
      )
    );
  });
};

const determineLifecycleStageToImplemented = (businessStatus, modelStatus) => {
  switch (businessStatus) {
    case status.fast_model_process:
      if (
        modelStatus === model_status.implemented_in_pim ||
        modelStatus === model_status.validated_outside_pim ||
        modelStatus === model_status.implemented_outside_pim
      ) {
        return status.validation;
      }
      break;

    case status.model:
      if (
        modelStatus === model_status.validated_outside_pim ||
        modelStatus === model_status.implemented_outside_pim
      ) {
        return status.validation;
      }
      break;

    case status.inegration_model:
      if (
        modelStatus === model_status.validated_outside_pim ||
        modelStatus === model_status.implemented_outside_pim
      ) {
        return status.validation;
      }
      break;

    case status.test_preprod_transfer_prod:
      if (
        modelStatus === model_status.implemented_in_pim ||
        modelStatus === model_status.validated_in_pim
      ) {
        return status.validation;
      }
      break;

    default:
      return businessStatus;
  }

  return businessStatus;
};

const acquireStageAndStatusFromCamunda = async (id, taskId, processDefinitionId, variables, context) => {
  let modelStatus = null;
  let modelStage = null;

  // Пробуем получить этап и статус из переменных Камунды (новые схемы)
  modelStatus = variables ? variables.model_status : await context.bpmn.getTaskVar(id, 'model_status');
  modelStage = variables ? variables.model_stage : await context.bpmn.getTaskVar(id, 'model_stage');

  if (!modelStatus && !modelStage) {
    // Не получили из переменных, пробуем найти в маппинге по текущей activity (user task или external task)
    let stageStatusMap = await context.db.task.getStatusStageMapByTask(taskId, processDefinitionId);

    if (stageStatusMap.length > 1) {
      // скорее всего есть дополнительные признаки, переменные по которым нужно выбрать точный вариант маппинга
      const model_deployment_approving_flg = variables.model_deployment_approving_flg
        ? variables.model_deployment_approving_flg 
        : await context.bpmn.getTaskVar(id, 'model_deployment_approving_flg');
      const pim_integration_flg = variables.pim_integration_flg 
        ? variables.pim_integration_flg 
        : await context.bpmn.getTaskVar(id, 'pim_integration_flg');

      stageStatusMap = stageStatusMap.filter((item) => {
        if (item.MODEL_DEPLOYMENT_APPROVING_FLG && item.MODEL_DEPLOYMENT_APPROVING_FLG !== model_deployment_approving_flg) {
          return false;
        }
        if (item.PIM_INTEGRATION_FLG && item.PIM_INTEGRATION_FLG !== pim_integration_flg) {
          return false;
        }
        return true;
      });
    }

    if (stageStatusMap[0]) {
      modelStatus = stageStatusMap[0].MODEL_STATUS;
      modelStage = stageStatusMap[0].MODEL_STAGE;
    } else {
      console.log('Ошибка получения статуса/этапа из Камунды.')
    }
  }

  // В схемах Камунды остались некорректные этапы и статусы, которые исправить невозможно, поэтому ловим и исправляем на лету
  if (modelStage === 'Вывод из эксплуатации') {
    modelStage = 'Вывод модели из эксплуатации';
  } else if (modelStage === 'Разаработка модели') {
    modelStage = 'Разработка модели';
  }

  if (modelStatus === 'Разработана, в процессе \nвнедрения') {
    modelStatus = 'Разработана, в процессе внедрения';
  } else if (modelStatus === 'Разаработка модели') {
    modelStatus = 'В процессе разработки';
  }

  return {modelStage: modelStage, modelStatus: modelStatus};
}

const camundaExternalTaskStatusDecorator = (callback, bpmn, db, changeStage = false) => {
  return async (task, taskService) => {
    await callback(task, taskService);

    const variables = task.variables.getAll();

    const { modelStage: modelStage, modelStatus: modelStatus } = await acquireStageAndStatusFromCamunda(
      task.id,
      task.activityId,
      task.processDefinitionId,
      variables,
      {
        bpmn: bpmn,
        db: db,
      },
    );

    if (changeStage && modelStage) {
      await this.db.card.changeStage({
        modelId: variables.model,
        modelStage: modelStage,
      });
    }

    if (modelStatus) {
      await db.card.changeStatus({
        modelId: variables.model,
        modelStatus: modelStatus ? modelStatus : null,
      });
      // проставляем флаг активности если модель перешла в архив (для моделей со статусом из камунды)
      if (modelStatus === 'Архив') {
        await db.card.editActiveStatus({MODEL_ID: variables.model, MODELS_IS_ACTIVE_FLG: 0});
      }
    }
  };
}

module.exports = {
  getLastActiveStatus,
  hasSpecificArtefactValue,
  determineLifecycleStageToImplemented,
  acquireStageAndStatusFromCamunda,
  camundaExternalTaskStatusDecorator,
};
