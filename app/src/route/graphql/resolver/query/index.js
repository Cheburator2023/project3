module.exports = {
  // eslint-disable-next-line global-require
  me: require("./me"),
  // Models
  cards: (root, args, context) =>
    context.db.card
      .all(args, context.user)
      .then((data) => {
        context.log({
          msg: "Реестр карточек",
        });

        return data;
      })
      .catch((e) => {
        context.log({
          msg: "Реестр карточек",
          event: "Ошибка",
        });
        throw e;
      }),
  card: (root, args, context) =>
    context.db.card
      .one(args, context.user)
      .then(async (data) => {
        context.log({
          msg: `Карточка ${ args.type.join(",") } для модели model${
            args.ROOT_MODEL_ID
          }-v${ args.MODEL_VERSION }`,
        });
        if (!data.MODEL_REPO_IS_CREATED) {
          try {
            const modelRepoIsCreated = await context.db.card.getRepoStatus(data.GENERAL_MODEL_ID, data.MODEL_ID);
            await context.db.card.editRepoStatus(data.MODEL_ID, modelRepoIsCreated);
            return {...data, MODEL_REPO_IS_CREATED: modelRepoIsCreated};
          } catch(e) {
            console.warn(`Unable to get repo status for model ${data.MODEL_ID}`, e);
          }
        }
        return data;
      })
      .catch((e) => {
        context.log({
          msg: `Карточка ${ args.type.join(",") } для модели model${
            args.ROOT_MODEL_ID
          }-v${ args.MODEL_VERSION }`,
          event: "Ошибка",
        });
        throw e;
      }),
  // Tasks
  tasks: (root, args, context) =>
    context.db.task
      .tasksList(context.user)
      .then((data) => {
        context.log({
          msg: `Список задач`,
        });
        return data;
      })
      .catch((e) => {
        context.log({
          msg: `Список задач`,
          event: "Ошибка",
        });
        throw e;
      }),
  task: (root, args, context) => context.db.task.one(args, context.user),
  tasksOperations: (root, args, context) =>
    context.db.task.tasksOperations(args),
  users: (root, args, context) => {
    if (args.db)
      return context.db.user.role(
        args.groups && args.groups.length ? args.groups[0] : ""
      );
    return context.integration.keycloak.usersByGroups(args, context.user); // business_customer
  },
  lead: () => ({ users: [], tasks: [] }),
  // Dash
  stats: (root, args, context) => {
    switch (args.type) {
      case "task":
        return context.db.stats.task(context.user);
      case "model":
        return context.db.stats.model();
      default:
        return [];
    }
  },
  bpmn: (parent, { id, history }, { bpmn }) => bpmn.instance(id, history),
  bpmnInstancesByKey: (root, { modelId, key }, { db }) => db.instance.check({ model: modelId, key }),
  // Admin
  fileDownload: (root, args, context) => context.integration.git.download(args),
  artefacts: () => ({ types: [], data: [] }),
  artefactById: (root, args, context) => context.db.artefact.artefactById(args),
  classificators: (root, args, context) => context.db.artefact.classificators(),
  status: (root, args, context) => context.db.card.status(),
  artefactHistory: (root, args, context) => context.db.artefact.history(args),
  // Auditor
  keycloakGroups: (root, args, context) =>
    context.integration.keycloak.groups(context.user),
  keycloakUsers: (root, args, context) =>
    context.integration.keycloak.getUsersByGroupsSystem(args.groups),
  riskScales: (root, args, context) => context.db.risk_scale.all(),
  riskScale: (root, args, context) => context.db.risk_scale.one(args),
  riskScaleInputArtefacts: (root, args, context) =>
    context.db.risk_scale.inputArtefact(),
  possibleValues: (root, args, context) =>
    context.db.artefact.possibleValues(args),
  rootAssignments: (root, args, context) => context.db.assignment.all(args),
  rootAssignment: (root, args, context) => context.db.assignment.root(args),
  assignment: (root, args, context) => context.db.assignment.one(args),
  inputArtefacts: (root, args, context) =>
    context.db.assignment.inputArtefacts(args),
  filledArtefact: (root, args, context) =>
    context.db.assignment.filledArtefact(args),
  MCoefficients: (root, args, context) => context.db.model_risk.all(args),
  allocations: (root, args, context) => context.db.allocations.getAllocations(),
  allocationUsage: (root, args, context) => context.db.allocations.getUsage(args),
  allocationUsageHist: (root, args, context) => context.db.allocations.getUsageHistory(args),
  getModelUsageConfirmation: (root, args, context) => context.db.allocations.getModelUsageConfirmation(args),
  getModelUsageConfirmationHistory: (root, args, context) => context.db.allocations.getModelUsageConfirmationHistory(args),
  // Frame
  // frameForm: (root, args, context) =>
  //     context.db.frame.form(args.id)
};
