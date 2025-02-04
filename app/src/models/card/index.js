const sql = require("./sql");
const cardArtefacts = require("./helpers/artefact");
const artefactRestrictions = require("./helpers/artefactRestrictions");
const {
  mapBusinessCustomerDepartments,
} = require("./helpers/businessCustomerDepartamentMapping");
const { getArguments, groupResponse } = require("./helpers/classificator");
const { DEPARTMENT_TO_STREAM_MAPPING } = require("../../common/mapping");

class Card {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  getGroupsAfterMapping(userGroups) {
    return userGroups.flatMap(
      (group) => DEPARTMENT_TO_STREAM_MAPPING[group] || group
    );
  }

  // Новая модель
  info = ({ MODEL_ID }) =>
    this.db
      .execute({
        sql: sql.info,
        args: { MODEL_ID },
      })
      .then((data) => data.rows[0]);

  new = async ({
    MODEL_ID,
    MODEL_NAME,
    MODEL_DESC,
    MODEL_CREATOR,
    PARENT_MODEL_ID,
    ARTEFACTS,
  }) => {
    if (PARENT_MODEL_ID) {
      const parentModel = await this.db
        .execute({ sql: sql.parent, args: { PARENT_MODEL_ID } })
        .then((data) => data.rows);

      const { ROOT_MODEL_ID, PARENT_MODEL_VERSION } = parentModel.reduce(
        (prev, curr) => {
          if (
            !prev.PARENT_MODEL_VERSION ||
            prev.PARENT_MODEL_VERSION < curr.PARENT_MODEL_VERSION
          )
            return curr;
          return prev;
        },
        {}
      );
      const args = {
        MODEL_ID,
        MODEL_NAME,
        MODEL_DESC,
        MODEL_CREATOR,
        ROOT_MODEL_ID,
        MODEL_VERSION: PARENT_MODEL_VERSION + 1,
      };
      return this.db.execute({ sql: sql.copy, args });
    }

    return this.db.execute({
      sql: sql.new,
      args: { MODEL_ID, MODEL_NAME, MODEL_DESC, MODEL_CREATOR, GENERAL_MODEL_ID: null },
    });
  };

  createNewByGeneralModelId = async ({
    MODEL_ID,
    MODEL_NAME,
    MODEL_DESC,
    generalModelId,
    MODEL_CREATOR,
  }) => {

    const rootModel = await this.db.execute({
      sql: sql.rootModelByGeneralModelId,
      args: { general_model_id: generalModelId },
    }).then((data) => data.rowCount > 0 ? data.rows[0] : null);

    if (rootModel) {
      return this.db.execute({
        sql: sql.copy,
        args: { 
          MODEL_ID, 
          MODEL_NAME, 
          MODEL_DESC, 
          MODEL_CREATOR, 
          ROOT_MODEL_ID: rootModel.ROOT_MODEL_ID,
          MODEL_VERSION: rootModel.MODEL_VERSION + 1,
          GENERAL_MODEL_ID: generalModelId,
        },
      });
    }

    return this.db.execute({
      sql: sql.new,
      args: { 
        MODEL_ID, 
        MODEL_NAME, 
        MODEL_DESC, 
        MODEL_CREATOR, 
        GENERAL_MODEL_ID: generalModelId,
      },
    });
  };

  // Получить все карточки по типу
  all = ({ type = [], active }, user) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);

    const args = {
      type,
      active: active ? "1" : "0",
      groups: user.groups.includes("ds") ? groupsAfterMapping : user.groups,
      is_ds_flg: user.groups.includes("ds") ? "1" : "0",
      is_bc_flg: user.groups.includes("business_customer") ? "1" : "0",
    };

    return this.db
      .execute({ sql: sql.all, args })
      .then((data) => data.rows)
      .then((data) =>
        data.reduce((prev, curr) => {
          const index = prev.findIndex((d) => d.MODEL_ID === curr.MODEL_ID);

          if (index > -1) {
            return prev;
          }

          prev.push({
            ...curr,
            TYPE: type.join(","),
          });

          return prev;
        }, [])
      );
  };

  modelsByBpmnIds = (bpmnInstancesIds) =>
    this.db
      .execute({
        sql: sql.modelsByBpmnIds,
        args: {
          bpmnInstancesIds,
        },
      })
      .then((data) => data.rows);

  // Get card by id and version
  one = async ({ type, ROOT_MODEL_ID, MODEL_VERSION }, user) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);

    const args = {
      type,
      ROOT_MODEL_ID,
      MODEL_VERSION,
      groups: user.groups.includes("ds") ? groupsAfterMapping : user.groups,
      is_ds_flg: user.groups.includes("ds") ? "1" : "0",
      is_bc_flg: user.groups.includes("business_customer") ? "1" : "0",
    };

    const model = await this.db.execute({ sql: sql.one, args }).then((data) => {
      if (data.rows.length) {
        return data.rows[0];
      }

      throw Error(`Model with root id: ${ROOT_MODEL_ID} not found`);
    });

    return {
      ...model,
      BUSINESS_CUSTOMER_DEPARTAMENT: mapBusinessCustomerDepartments(
        model.BUSINESS_CUSTOMER_DEPARTAMENT
      ),
      TYPE: type.join(","),
    };
  };

  // Get instances for card with id and version
  instance = ({ MODEL_ID }) => {
    return this.db
      .execute({ sql: sql.instance, args: { MODEL_ID } })
      .then((data) => data.rows)
      .then((data) =>
        data.reduce((prev, curr) => {
          const index = prev.findIndex(
            (p) => p.BPMN_KEY_ID === curr.BPMN_KEY_ID
          );
          if (index > -1) {
            const a = new Date(prev[index].EFFECTIVE_FROM).getTime();
            const b = new Date(curr.EFFECTIVE_FROM).getTime();
            if (a < b) prev[index] = curr;
            return prev;
          }
          prev.push(curr);
          return prev;
        }, [])
      );
  };

  // Get all versions of card
  version = ({ ROOT_MODEL_ID }) =>
    this.db
      .execute({ sql: sql.version, args: { ROOT_MODEL_ID } })
      .then((data) => data.rows.map((row) => row.MODEL_VERSION));

  // Card's artefacts
  artefacts = (models, user, is_class_flg) =>
    this.db
      .execute({
        sql: sql.artefacts,
        args: {
          ...getArguments(models),
          is_class_flg,
        },
      })
      .then((data) => data.rows)
      .then((data) => artefactRestrictions(data, user))
      .then((data) => groupResponse(data, models));

  // Card's artefacts by type
  // TODO: Check that artefact method is using somewhere
  artefact = ({ MODEL_ID, TYPE }, is_class_flg = false) =>
    this.db
      .execute({
        sql: sql.artefact,
        args: { MODEL_ID, TYPE, is_class_flg: is_class_flg ? "1" : "-1" },
      })
      .then((data) => data.rows)
      .then(cardArtefacts);

  status = () =>
    this.db
      .execute({ sql: sql.status, args: {} })
      .then((data) =>
        data.rows.map((row) => row.MODEL_STATUS).filter((row) => row)
      );

  cancel = ({ model }) => this.db.execute({ sql: sql.cancel, args: { model } });

  // RISK_SCALE
  risk = (MODEL_ID) =>
    this.db
      .execute({ sql: sql.risk, args: { MODEL_ID } })
      .then((data) => data.rows);

  assignments = (MODEL_ID) =>
    this.db
      .execute({ sql: sql.assignments, args: { MODEL_ID } })
      .then((data) => data.rows);

  autoMLRootModel = ({ MODEL_NAME, MODEL_DESC }) => {
    // Replace all from beginning of the string till the first # symbol
    const parsedName = MODEL_NAME?.replace(/^[^#]+/, "");

    if (parsedName) {
      return this.db
        .execute({
          sql: sql.autoMLRootModel,
          args: {
            MODEL_NAME: `%${parsedName}`,
            MODEL_DESC,
          },
        })
        .then(({ rows = [] }) => {
          if (rows.length === 1) {
            // Model found
            return rows[0].MODEL_ID;
          } else if (rows.length > 1) {
            // Multiple choices available
            console.warn(
              `Не удалось определить родительскую модель из БД выборки:`,
              rows
            );
          }

          // Model not found
          return null;
        });
    }

    return null;
  };

  editName = ({ MODEL_ID, MODEL_NAME }) =>
    this.db.execute({
      sql: sql.edit_name,
      args: { MODEL_ID, MODEL_NAME },
    });

  editDesc = ({ MODEL_ID, MODEL_DESC }) =>
    this.db.execute({
      sql: sql.edit_desc,
      args: { MODEL_ID, MODEL_DESC },
    });

  changeStatus = ({ modelId, modelStatus }) =>
    this.db.execute({
      sql: sql.edit_status,
      args: { model_id: modelId, model_status: modelStatus },
    });

  addStage = async ({ modelId, modelStage }) => {
    if (!modelStage) {
      return;
    }

    const model = await this.db
      .execute({ sql: sql.info, args: { MODEL_ID: modelId } })
      .then((data) => {
        if (data.rows.length) {
          return data.rows[0];
        }

        throw Error(`Model with id: ${modelId} not found`);
      });

    let stages = model.model_stage ? model.model_stage.split(";") : [];
    stages.push(modelStage);

    this.db.execute({
      sql: sql.edit_stage,
      args: { model_id: modelId, model_stage: stages.join(";") },
    });
  };

  removeStage = async ({ modelId, modelStage }) => {
    if (!modelStage) {
      return;
    }

    const model = await this.db
      .execute({ sql: sql.info, args: { MODEL_ID: modelId } })
      .then((data) => {
        if (data.rows.length) {
          return data.rows[0];
        }

        throw Error(`Model with id: ${modelId} not found`);
      });

    if (!model.model_stage) {
      return;
    }

    let stages = model.model_stage.split(";");
    const deleteIndex = stages.indexOf(modelStage);
    if (deleteIndex > -1) {
      stages.splice(deleteIndex, 1);
    }

    this.db.execute({
      sql: sql.edit_stage,
      args: {
        model_id: modelId,
        model_stage: stages.length ? stages.join(";") : null,
      },
    });
  };
}

module.exports = Card;
