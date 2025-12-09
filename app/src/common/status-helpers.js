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
    const stageStatusMap = await context.db.task.getStatusStageMapByTask(taskId, processDefinitionId);

    if (stageStatusMap) {
      modelStatus = stageStatusMap.MODEL_STATUS;
      modelStage = stageStatusMap.MODEL_STAGE;
    } else {
      console.log('Ошибка получения статуса/этапа из Камунды.')
    }
  }

  return {modelStage: modelStage, modelStatus: modelStatus};
}

module.exports = {
  getLastActiveStatus,
  hasSpecificArtefactValue,
  determineLifecycleStageToImplemented,
  acquireStageAndStatusFromCamunda,
};
