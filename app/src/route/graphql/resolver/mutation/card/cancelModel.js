const availableGroups = ["ds", "ds_lead", "mipm"];
const initializationInstanceKey = "initialization";
const cancelInstanceKey = "suspend";

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

    /* Create cancel model instance */
    let cancel_role = null;
    if (groups.includes("ds")) cancel_role = "ds";
    if (groups.includes("ds_lead")) cancel_role = "ds_lead";
    if (groups.includes("mipm")) cancel_role = "mipm";

    /* Get initialization instance by model_id */
    const [initializationInstance] =
      await context.db.instance.getInstancesByModelIdAndKey({
        model,
        key: initializationInstanceKey,
      });

    if (!initializationInstance) {
      throw new Error("Initialization instance not found.");
    }

    /* Start cancel BPMN-instance on newest deployed schema */
    const instance = await context.bpmn
      .start(
        cancelInstanceKey,
        JSON.stringify({
          variables: {
            model: { value: model },
            cancel_role: { value: cancel_role },
            suspend_reason: { value: "mistake" }, // archive
          },
        })
      )
      .then((d) => d.id);

    return instance;
  } catch (error) {
    console.error(
      "Error occurred while processing cancel model instance:",
      error
    );
    throw new Error(
      "An error occurred while processing the cancel instance. Please try again."
    );
  }
};
