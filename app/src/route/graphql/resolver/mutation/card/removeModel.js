const availableGroups = ["ds", "ds_lead", "mipm"];
const removalInstanceKey = "suspend";

const checkRoleModel = (userGroups) =>
  availableGroups.some((groupName) => userGroups.includes(groupName));

const getUserRole = (userGroups) => {
  if (userGroups.includes("mipm")) {
    return "mipm";
  }
  if (userGroups.includes("ds_lead")) {
    return "ds_lead";
  }

  return null;
};

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

  /* Create removal model instance */
  const userRole = getUserRole(groups);

  const instance = await context.bpmn
    .start(
      removalInstanceKey,
      JSON.stringify({
        variables: {
          model: { value: modelId },
          remove_role: { value: userRole },
          suspend_reason: { value: "archive" },
        },
      })
    )
    .then((d) => d.id)
    .catch((e) => console.error(e));

  await context.db.instance.new({
    model: modelId,
    instance,
    key: removalInstanceKey,
  });

  return instance;
};
