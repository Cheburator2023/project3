const moment = require("moment");
const activity = require("./bpmnActivity");
const { status, model_status } = require("./status");

const {
  getLastActiveStatus,
  hasSpecificArtefactValue,
  determineLifecycleStageToImplemented,
} = require("./helpers");

// Особенности маппинга статусов:
// Ести статус модели Разработана не внедрена, Этап ЖЦМ тоже должен быть Разработана не внедрена
// После переработки функционала статусов и этапов ЖЦ моделей в приоритете берётся значение из таблицы в БД. Если данных нет (у старых моделей) работает прежняя логика
module.exports = {
  Card: {
    MODEL_ALIAS: (root) => `model${root.ROOT_MODEL_ID}-v${root.MODEL_VERSION}`,
    STATUS: ({ STATUS, MODEL_STATUS }) =>
      MODEL_STATUS ? MODEL_STATUS : getLastActiveStatus(STATUS),
    BUSINESS_STATUS: ({
      STATUS,
      BPMN_INSTANCE_NAME,
      MODEL_STATUS,
      MODEL_STAGE,
    }) => {
      if (MODEL_STATUS || MODEL_STAGE) {
        return MODEL_STAGE;
      }

      const lastActiveStatus = getLastActiveStatus(STATUS);
      let currentBusinessStatus = status?.[BPMN_INSTANCE_NAME.trim()];

      currentBusinessStatus = determineLifecycleStageToImplemented(
        currentBusinessStatus,
        lastActiveStatus
      );

      switch (lastActiveStatus) {
        case model_status.developed_not_implemented:
          return lastActiveStatus;
        case model_status.removed_from_operation:
          return lastActiveStatus;
        default:
          return currentBusinessStatus;
      }
    },
    TASKS: (root, args, context) => context.db.task.model(root, context.user),
    CLASSIFICATORS: ({ MODEL_ID, TYPE }, args, { loaders, user }) =>
      loaders.card.classificators.load({ MODEL_ID, TYPE }, user, true),
    INSTANCES: (root, args, context) => context.db.card.instance(root),
    ARTEFACTS: ({ MODEL_ID, TYPE }, args, { loaders, user }) =>
      loaders.card.artefacts.load({ MODEL_ID, TYPE }, user),
    VERSIONS: (root, args, context) => context.db.card.version(root),
    USERS: (root, args, { loaders }) => loaders.user.users.load(root.MODEL_ID),
    UPDATE_DATE: (root) => moment(root.UPDATE_DATE).format("DD.MM.YYYY HH:mm"),
    RISK_SCALE: (root, args, context) => context.db.card.risk(root.MODEL_ID),
    AUTOML_FLG: (root) => (root.AUTOML_FLG == "true" ? "Да" : "Нет"),
    ASSIGNMENTS: (root, args, context) =>
      context.db.card.assignments(root.MODEL_ID),
    CALIBRATION_MODEL: async ({ MODEL_ID, TYPE }, args, { loaders, user }) => {
      const modelArtefacts = await loaders.card.artefacts.load(
        { MODEL_ID, TYPE },
        user
      );

      const DEVELOPING_MODEL_REASON_ARTEFACT_ID = 69;
      const CALIBRATION_MODEL_ARTEFACT_VALUE_ID = 143;

      return hasSpecificArtefactValue(
        modelArtefacts,
        DEVELOPING_MODEL_REASON_ARTEFACT_ID,
        CALIBRATION_MODEL_ARTEFACT_VALUE_ID
      );
    },
  },
  Task: {
    USER_GROUPS: (root, args, context) =>
      root.USER_GROUPS ? root.USER_GROUPS.split(",") : [],
    ARTEFACTS: (root, args, context) =>
      context.db.task.artefact(root, context.user),
    created: (root) => moment(root.created).format("DD.MM.YYYY HH:mm"),
  },
  TaskArtefact: {
    CURRENT_VALUES: (root) => {
      if (
        !root.CURRENT_VALUES.length &&
        [168, 169, 170, 171, 172].includes(root.ARTEFACT_ID)
      )
        return [
          {
            ARTEFACT_STRING_VALUE: `${
              root.ARTEFACT_DEFAULT_VALUE || ""
            } для модели model${root.ROOT_MODEL_ID}-v${root.MODEL_VERSION}`,
            ARTEFACT_VALUE_ID: null,
            ARTEFACT_PARENT_VALUE_ID: null,
          },
        ];
      if (
        !root.CURRENT_VALUES.length &&
        [235, 237, 239, 241, 243].includes(root.ARTEFACT_ID)
      )
        return [
          {
            ARTEFACT_STRING_VALUE: `${root.ROOT_MODEL_ID}-${root.MODEL_VERSION}-${root.ARTEFACT_ID}`,
            ARTEFACT_VALUE_ID: null,
            ARTEFACT_PARENT_VALUE_ID: null,
          },
        ];
      return root.CURRENT_VALUES;
    },
    ARTEFACT_IO_TYPE: (root) => {
      switch (root.ARTEFACT_IO_TYPE) {
        case "I":
          return 2;
        case "IO":
          return 1;
        default:
          return 0;
      }
    },
  },
  Lead: {
    users: (root, args, context) =>
      context.integration.keycloak
        .usersLead(context.user, context.user)
        .then((data) =>
          data.reduce((prev, user) => {
            const index = prev.findIndex((p) => p.id === user.id);

            if (index > -1) {
              prev[index].groups.push(user.group);
            } else {
              user.groups = [user.group];
              prev.push(user);
            }

            return prev;
          }, [])
        ),
    tasks: (root, args, context) => context.db.task.all(context.user, true),
  },
  Bpmn: {
    endTime: (parent) => new Date(parent.endTime).getDate(),
    diagram: (parent, agrs, { bpmn }) =>
      bpmn.diagram(parent.processDefinitionId),
    activity,
  },
  ArtefactValue: {
    /* ARTEFACT_STRING_VALUE: (root) => {
            if (Date.parse((root.ARTEFACT_STRING_VALUE)))
                return moment(Date.parse((root.ARTEFACT_STRING_VALUE)))
                    .tz('Europe/Moscow')
                    .format('DD.MM.YYYY HH:mm')
            return root.ARTEFACT_STRING_VALUE
        } */
  },
  AdminArtefactInfo: {
    TYPES: (root, args, context) => context.db.artefact.type(),
    ARTEFACTS: (root, args, context) => context.db.artefact.all(),
  },
  AdminArtefact: {
    VALUES: (root, args, context) => {
      return root.VALUES.sort(
        (a, b) => a.ARTEFACT_VALUE_ID - b.ARTEFACT_VALUE_ID
      ).reduce((prev, curr) => {
        const check =
          prev.filter((p) => p.ARTEFACT_VALUE_ID === curr.ARTEFACT_VALUE_ID)
            .length > 0;

        if (check) {
          return prev;
        }

        prev.push(curr);
        return prev;
      }, []);
    },
  },
  RiskScale: {
    ARTEFACTS: (root, args, context) => context.db.risk_scale.artefacts(root),
    CREATE_DATE: (root) => moment(root.CREATE_DATE).format("DD.MM.YYYY HH:mm"),
    UPDATE_DATE: (root) => moment(root.UPDATE_DATE).format("DD.MM.YYYY HH:mm"),
    MODELS: (root, args, context) =>
      context.db.risk_scale.models(root, context.user),
    RELATED_MODELS: (root, args, context) =>
      context.db.risk_scale.related_models(root, context.user),
    RANKS: (root, args, context) => context.db.risk_scale.rank(root),
  },
  RootAssignment: {
    CREATE_DATE: (root) => moment(root.CREATE_DATE).format("DD.MM.YYYY HH:mm"),
    EFFECTIVE_TO: (root) =>
      moment(root.EFFECTIVE_TO).format("DD.MM.YYYY HH:mm"),
    MODELS: (root, args, { loaders }) =>
      loaders.assignment.models.load({ rootAssignmentId: root.ID }),
    ASSIGNMENTS: (root, args, { loaders }) =>
      loaders.assignment.assignments.load({ rootAssignmentId: root.ID }),
    END_DATE: (root) => moment(root.END_DATE).format("DD.MM.YYYY"),
  },
  Assignment: {
    CREATE_DATE: (root) => moment(root.CREATE_DATE).format("DD.MM.YYYY HH:mm"),
    EFFECTIVE_FROM: (root) =>
      moment(root.EFFECTIVE_FROM).format("DD.MM.YYYY HH:mm"),
    EFFECTIVE_TO: (root) =>
      moment(root.EFFECTIVE_TO).format("DD.MM.YYYY HH:mm"),
    ARTEFACTS: (root, args, { loaders }) =>
      loaders.assignment.artefacts.load({ assignmentId: root.ID }),
  },
  MCoefficient: {
    VALUE: (root) => parseFloat(root.VALUE.toFixed(4)),
  },
  DateItem: {
    dateFormatted: (root) => moment(root).format("DD.MM.YYYY HH:mm"),
    timestampt: (root) => root,
  },
};
