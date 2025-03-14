const availableGroups = ["ds", "ds_lead", "mipm"];
const cancelInstanceKey = "model_state_transition";

module.exports = async (root, args, context) => {
  try {
    const model = args.MODEL_ID;

    /* Check role model. Only ds, ds_lead, mipm */
    const { groups } = context.user;
    const checkRoleModel =
      availableGroups.filter((g) => groups.includes(g)).length > 0;
    if (!checkRoleModel) return null;

    /* Check if already exist */
    const checkCancelInstance = await context.db.instance.check({
      model,
      key: cancelInstanceKey,
    });

    if (checkCancelInstance.length > 0) {
      return checkCancelInstance[0].BPMN_INSTANCE_ID;
    }

    /* Start cancel BPMN-instance on newest deployed schema */
    const instance = await context.bpmn
      .start(
        cancelInstanceKey,
        JSON.stringify({
          variables: {
            model: { value: model },
            transition_reason: { value: "mistake" }, // archive
          },
        })
      )
      .then((d) => d.id);

    return instance;
  } catch (error) {
    console.error(error);
    throw new Error(
      "An error occurred while processing the cancel instance. Please try again."
    );
  }
};
