const availableGroups = ["ds", "ds_lead", "mipm"];
const instanceKey = "model_state_transition";

module.exports = async (root, args, context) => {
  try {
    const { modelId, transitionReason } = args;

    /* Check role model. Only ds, ds_lead, mipm */
    const { groups } = context.user;
    const userHasAccess = availableGroups.some((groupName) =>
      groups.includes(groupName)
    );

    if (!userHasAccess) {
      return null;
    }

    /* Check if already exist */
    const modelStateTransitionInstance = await context.db.instance.check({
      model: modelId,
      key: instanceKey,
    });

    if (modelStateTransitionInstance.length > 0) {
      throw new Error(
        `Model state transition instance already exist in DB, id: ${modelStateTransitionInstance[0].BPMN_INSTANCE_ID}`
      );
    }

    const instance = await context.bpmn
      .start(
        instanceKey,
        JSON.stringify({
          variables: {
            model: { value: model },
            transition_reason: { value: transitionReason },
          },
        })
      )
      .then((d) => d.id);

    return instance;
  } catch (error) {
    console.error(
      "Error occurred while processing model state transition instance:",
      error
    );
    throw new Error(
      "An error occurred while processing the model state transition instance. Please try again."
    );
  }
};
