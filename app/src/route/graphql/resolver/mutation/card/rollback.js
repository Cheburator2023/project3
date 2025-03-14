const getUserName = require("./helpers");

const bpmnKeyCancelModel = 22;

const getTaskRolledbackFrom = async (MODEL_ID, context) => {
  const activeTasks = (
    await context.db.task.model({ MODEL_ID }, context.user)
  ).filter(({ TASK_ID }) => TASK_ID !== "cancel_model_development_ds_lead");

  if (!activeTasks.length) {
    return null;
  }

  return activeTasks[0]?.taskDefinitionKey;
};

const deleteRollbackedProcessInstances = async ({
  activity,
  modelId,
  context,
}) => {
  const activityIdRolledBackTo = activity[activity.length - 1].activityId;

  const bpmnKeyIdRolledbackTo = (
    await context.db.task.getBpmnKeyByTaskId(activityIdRolledBackTo)
  )?.BPMN_KEY_ID;

  if (!bpmnKeyIdRolledbackTo) {
    return null;
  }

  const processInstancesIdsToDelete = (
    await context.db.instance.getInstancesByModelId(modelId)
  )
    .filter(
      ({ BPMN_KEY_ID }) =>
        BPMN_KEY_ID > bpmnKeyIdRolledbackTo &&
        BPMN_KEY_ID !== bpmnKeyCancelModel
    )
    .map(({ BPMN_INSTANCE_ID }) => BPMN_INSTANCE_ID);

  if (processInstancesIdsToDelete.length) {
    await context.db.instance.deleteBpmnInstance(processInstancesIdsToDelete);
  }
};

module.exports = async (root, { activity }, context) => {
  const info = await context.db.instance.info(activity[0]);

  if (!info.length) {
    return null;
  }

  const { MODEL_ID, MODEL_IS_ACTIVE_FLG, ...model } = info[0];

  const taskRolledbackFrom = await getTaskRolledbackFrom(MODEL_ID, context);

  // Validate the consistency of a model's state between the database and Camunda.
  const validationModelStatus =
    await context.db.card.validateModelStateConsistency(MODEL_ID);

  if (validationModelStatus.error) {
    throw new Error(validationModelStatus.errorMessage);
  }

  // Ensure the model is active in Camunda before proceeding with the modification process. Activate it if necessary.
  if (!MODEL_IS_ACTIVE_FLG) {
    await context.bpmn.toggleModelSuspension({
      modelId: MODEL_ID,
      suspended: false,
    });
  }

  return context.bpmn
    .modify(activity)
    .then(async (data) => {
      const users = await context.db.user.card(MODEL_ID);

      await deleteRollbackedProcessInstances({
        activity,
        modelId: MODEL_ID,
        context,
      });

      const taskRolledBackTo = activity[activity.length - 1];

      const groups = users
        .map((u) => u.role)
        .filter((u, ind, arr) => {
          const index = arr.findIndex((a) => a === u);
          if (index === ind) return true;
          return false;
        });

      const keycloakUsers =
        await context.integration.keycloak.getUsersByGroupsSystem(groups);

      const emails = new Set(
        keycloakUsers
          .filter((u) => {
            if (!u.email) return false;
            if (users.filter((us) => us.username === u.username).length > 0)
              return true;
            return false;
          })
          .map((u) => u.email)
      );

      // Activate model in DB if it's not active
      if (!MODEL_IS_ACTIVE_FLG) {
        await context.db.card.editActiveStatus({
          MODEL_ID,
          MODELS_IS_ACTIVE_FLG: "1",
        });
      }

      if (taskRolledbackFrom) {
        // Add "roll back" log to tasks operations
        await context.db.task.addOperationLog({
          MODEL_ID,
          TASK_ID: taskRolledBackTo.activityId,
          OPERATION: "rollback",
          USER_NAME: getUserName(context.user),
          TASK_ID_ROLLED_BACK_FROM: taskRolledbackFrom,
        });
      }

      try {
        await context.integration.smtp.email({
          to: Array.from(emails),
          subject: "Откат бизнес процесса",
          text_content: `Откат бизнес процесса на шаг ${taskRolledBackTo.activityName} для модели model${model.ROOT_MODEL_ID}-v${model.MODEL_VERSION}`,
        });
      } catch {
        console.log("Error on send emails with rollback operation");
      }

      return data;
    })
    .catch(async (e) => {
      // If an error occurred during rollback and the model was activated, suspend it again
      if (!MODEL_IS_ACTIVE_FLG) {
        await context.bpmn.toggleModelSuspension({
          modelId: MODEL_ID,
          suspended: true,
        });
      }

      console.error(
        'Something went wrong in the "rollback" mutation resolve',
        e
      );

      throw e;
    });
};
