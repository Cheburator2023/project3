const getUserName = require("./helpers");

// This array contains bpmn key ids that are linked to the model state transition schemas.
// These processes should not be removed after rollback
const BPMN_KEYS_NOT_TO_COUNT = [18, 22, 29];

// This array contains task ID tech labels that are linked to the model state transition schemas.
// These tasks should not be counted as active tasks during the rollback operation.
const TASK_IDS_NOT_TO_COUNT = [
  "cancel_model_development_ds_lead",
  "model_decommiss_confirm_ds",
  "model_decommiss_confirm_rm",
];

const MODEL_STAGES_FROM_TRANSITION_PROCESS = [
  "Отмена разработки",
  "Вывод из эксплуатации",
];

const BPMN_INTERMEDIATE_TIMER_ACTIVITY_TYPE_NAME = "intermediateTimer";

/**
 * Retrieves the first active task for a given model, excluding tasks with specific IDs.
 *
 * @param {string} MODEL_ID - The ID of the model to retrieve tasks for.
 * @param {object} context - The context containing the database and user information.
 * @returns {object|null} The first active task object or null if no active tasks are found.
 * @throws Will log an error message if an exception occurs during the retrieval process.
 */
const getActiveTask = async (MODEL_ID, context) => {
  try {
    const activeTasks = (
      await context.db.task.getByModel({ MODEL_ID }, context.user.groups)
    ).filter(({ TASK_ID }) => !TASK_IDS_NOT_TO_COUNT.includes(TASK_ID));

    if (!activeTasks.length) {
      return null;
    }

    return activeTasks[0];
  } catch (e) {
    console.error("Error on getLastActiveTask", e);
    return null;
  }
};
// TODO: refactor this function
const deleteRolledBackProcessInstances = async ({
  taskRolledBackTo,
  modelId,
  context,
}) => {
  try {
    // 1. Get all process instances that should be deleted after rollback
    const processInstancesIdsToDelete = (
      await context.db.instance.getInstancesByModelId(modelId)
    )
      .filter(
        ({ BPMN_KEY_ID }) =>
          BPMN_KEY_ID > taskRolledBackTo.BPMN_KEY_ID &&
          !BPMN_KEYS_NOT_TO_COUNT.includes(BPMN_KEY_ID)
      )
      .map(({ BPMN_INSTANCE_ID }) => BPMN_INSTANCE_ID);

    if (processInstancesIdsToDelete.length) {
      // 2. Delete process instances from database
      await context.db.instance.deleteBpmnInstance(processInstancesIdsToDelete);
    }
  } catch (e) {
    throw new Error(`Error on deleteRolledBackProcessInstances, ${e.message}`);
  }
};

const sendEmails = async (
  { MODEL_ID, ROOT_MODEL_ID, MODEL_VERSION },
  taskRolledBackTo,
  context
) => {
  const users = await context.db.user.card(MODEL_ID);

  const uniqueGroups = Array.from(new Set(users.map(({ role }) => role)));

  const keycloakUsers =
    await context.integration.keycloak.getUsersByGroupsSystem(uniqueGroups);

  const emails = Array.from(
    new Set(
      keycloakUsers
        .filter(
          ({ email, username }) =>
            email && users.some((user) => user.username === username)
        )
        .map(({ email }) => email)
    )
  );

  try {
    await context.integration.smtp.email({
      to: emails,
      subject: "Откат бизнес процесса",
      text_content: `Откат бизнес процесса на шаг ${taskRolledBackTo.activityName} для модели model${ROOT_MODEL_ID}-v${MODEL_VERSION}`,
    });
  } catch {
    console.log("Error on send emails with rollback operation");
  }
};

/**
 * Retrieves model information for a given activity by querying the database
 * using the process instance ID from the first activity element.
 *
 * @param {Array} activity - An array of activity objects, where the first element
 *                           contains the process instance ID for rollback.
 * @param {Object} context - The context object containing the database instance
 *                           for querying model information.
 * @returns {Object} The model information object corresponding to the process
 *                   instance ID.
 * @throws {Error} If the model information is not found or an error occurs during
 *                 the database query.
 */
const getModelInfo = async (activity, context) => {
  try {
    const processInstanceRollbackTo = activity[0]?.processInstanceId;

    const modelInfo = await context.db.instance.info({
      processInstanceId: processInstanceRollbackTo,
    });
    if (!modelInfo || !modelInfo[0]) {
      throw new Error("Model not found of roll back activity");
    }

    return modelInfo[0];
  } catch (e) {
    throw e;
  }
};

/**
 * Updates the model state and stage in the database based on the task variables.
 *
 * @param {Object} task - The task object containing the model ID.
 * @param {Object} context - The context object providing access to BPMN and database operations.
 * @throws {Error} Throws an error if updating the model state or stage fails.
 */
const updateModelState = async (task, context) => {
  try {
    const newModelStatus = await context.bpmn.getTaskVar(
      task.id,
      "model_status"
    );
    const newModelStage = await context.bpmn.getTaskVar(task.id, "model_stage");

    console.log(
      "Update model status and stage:",
      newModelStatus,
      newModelStage
    );

    await context.db.card.changeStatus({
      modelId: task.MODEL_ID,
      modelStatus: newModelStatus || null,
    });
    await context.db.card.changeStage({
      modelId: task.MODEL_ID,
      modelStage: newModelStage || null,
    });
  } catch (e) {
    throw new Error(`UpdateModelState error: ${e.message}`);
  }
};

/**
 * Checks if the model's final status is an intermediate timer activity.
 *
 * @param {string} modelId - The ID of the model to check.
 * @param {object} context - The context containing the BPMN activity method.
 * @returns {Promise<boolean>} - A promise that resolves to true if the model's
 * final activity is an intermediate timer, otherwise false.
 * @throws Will throw an error if the operation fails.
 */
const checkModelFinalStatus = async (modelId, context) => {
  try {
    const BPMN_INTERMEDIATE_TIMER_ACTIVITY_TYPE_NAME = "intermediateTimer";

    const activitiesOnMainProcess = await context.bpmn.activity(modelId, false);

    if (activitiesOnMainProcess.length === 1) {
      const isActivityFinalTimer =
        activitiesOnMainProcess[0].activityType ===
        BPMN_INTERMEDIATE_TIMER_ACTIVITY_TYPE_NAME;

      return isActivityFinalTimer;
    }

    return false;
  } catch (e) {
    console.error("Error on checkModelFinalStatus:", e.message);

    return false;
  }
};

module.exports = async (root, { activity }, context) => {
  try {
    const { MODEL_ID, MODELS_IS_ACTIVE_FLG } = await getModelInfo(
      activity,
      context
    );

    const modelStateValidationResult =
      await context.db.card.validateModelStateConsistency(MODEL_ID);

    if (modelStateValidationResult.error) {
      throw new Error(modelStateValidationResult.errorMessage);
    }

    if (MODELS_IS_ACTIVE_FLG === "0") {
      await context.bpmn.toggleModelSuspension({
        modelId: MODEL_ID,
        suspended: false,
      });

      await context.db.card.editActiveStatus({
        MODEL_ID,
        MODELS_IS_ACTIVE_FLG: 1,
      });
    }

    const activeTaskBeforeRollback = await getActiveTask(MODEL_ID, context);

    if (!activeTaskBeforeRollback) {
      const isModelOnFinalStatus = await checkModelFinalStatus(
        MODEL_ID,
        context
      );

      if (!isModelOnFinalStatus) {
        throw new Error(
          "activeTaskBeforeRollback is not defined. Cannot modify the process until this issue is resolved."
        );
      }
    }

    // 0. Modify process instance to rollback
    return context.bpmn.modify(activity).then(async (data) => {
      const activeTaskAfterRollback = await getActiveTask(MODEL_ID, context);

      if (!activeTaskAfterRollback) {
        throw new Error(
          `After a rollback, updates cannot be executed because the variable "activeTaskAfterRollback" is not defined.`
        );
      }

      // 1. Update model stage and status
      await updateModelState(activeTaskAfterRollback, context);

      // 2. Delete rolled back process instances
      await deleteRolledBackProcessInstances({
        taskRolledBackTo: activeTaskAfterRollback,
        modelId: MODEL_ID,
        context,
      });

      // 3. Send email
      // await sendEmails(modelInfo, taskRolledBackTo, context);

      // 4. Add "roll back" log to tasks operations
      await context.db.task.addOperationLog({
        MODEL_ID,
        TASK_ID: activeTaskAfterRollback.taskDefinitionKey,
        OPERATION: "rollback",
        USER_NAME: getUserName(context.user),
        TASK_ID_ROLLED_BACK_FROM:
          activeTaskBeforeRollback?.taskDefinitionKey || "",
      });

      return data;
    });
  } catch (e) {
    if (!(e instanceof Error)) {
      e = new Error(e);
    }

    console.error(e);
    throw e;
  }
};
