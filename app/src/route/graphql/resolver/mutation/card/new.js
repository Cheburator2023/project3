const getUserName = require("./helpers");
const {
  DEPARTMENT_TO_STREAM_MAPPING,
} = require("../../../../../common/mapping");

const getDepartmentFromStream = (stream) => {
  for (const [department, streams] of Object.entries(
    DEPARTMENT_TO_STREAM_MAPPING
  )) {
    if (streams.includes(stream)) {
      return department;
    }
  }
  return null;
};

module.exports = async (root, args, context) => {
  // New Camunda instance
  const camundaInstance = await context.bpmn.start();
  // Insert DB
  args.MODEL_ID = camundaInstance.id;
  args.MODEL_CREATOR = getUserName(context.user);

  await context.db.card.new(args);
  // Create git
  const dbNewModel = await context.db.card.info(args);
  const MODEL_ALIAS = `model${dbNewModel.ROOT_MODEL_ID}-v${dbNewModel.MODEL_VERSION}`;

  if (args.PARENT_MODEL_ID) {
    const parentModelInfo = await context.db.card.info({
      MODEL_ID: args.PARENT_MODEL_ID,
    });

    /* Add link to prev model version */
    args.ARTEFACTS.push({
      ARTEFACT_ID: 46,
      ARTEFACT_VALUE_ID: null,
      ARTEFACT_STRING_VALUE: `${process.env.INTERFACE_URL}sum/model/${parentModelInfo.ROOT_MODEL_ID}/${parentModelInfo.MODEL_VERSION}/main`,
    });
    /* Copy artefacts from parent to new model */
    const PARENT_MODEL_ALIAS = `model${parentModelInfo.ROOT_MODEL_ID}-v${parentModelInfo.MODEL_VERSION}`;
    await context.integration.git.copy(PARENT_MODEL_ALIAS, MODEL_ALIAS);
    await context.db.artefact.copy(args);
  } else {
    await context.integration.git.project(MODEL_ALIAS);
    await context.integration.git.repo(MODEL_ALIAS);
  }

  const stream = args.ARTEFACTS.find(
    (i) => i.ARTEFACT_ID === 7
  ).ARTEFACT_STRING_VALUE;
  const dept = getDepartmentFromStream(stream);

  await context.db.user.addLead(
    args.MODEL_ID,
    dept,
    args.MIPM,
    args.business_customer
  );
  // Insert artefacts
  await context.db.artefact.update({
    MODEL_ID: dbNewModel.MODEL_ID,
    ARTEFACT_IDS: args.ARTEFACTS.map((a) => a.ARTEFACT_ID),
  });
  await context.db.artefact.add(args);
  await context.bpmn.msg(args.MODEL_ID);

  return dbNewModel;
};
