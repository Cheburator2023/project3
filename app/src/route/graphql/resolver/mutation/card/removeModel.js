const availableGroups = ["ds", "ds_lead", "mipm"];
const removalInstanceKey = "model_state_transition";

const checkRoleModel = (userGroups) =>
  availableGroups.some((groupName) => userGroups.includes(groupName));

module.exports = async (root, args, context) => {
  const modelId = args.MODEL_ID;

  /* Check role model. Only ds_lead, mipm */
  const { groups } = context.user;
  const userHasAccess = checkRoleModel(groups);

  if (!userHasAccess) {
    return null;
  }

  /* Check if already exist */
  const checkRemovalInstance = await context.db.instance.check({
    model: modelId,
    key: removalInstanceKey,
  });

  if (checkRemovalInstance.length > 0) {
    return checkRemovalInstance[0].BPMN_INSTANCE_ID;
  }

  const instance = await context.bpmn
    .start(
      removalInstanceKey,
      JSON.stringify({
        variables: {
          model: { value: modelId },
          transition_reason: { value: "archive" },
        },
      })
    )
    .then((d) => d.id);

  return instance;
};
