const sql = require("./sql");
const cardArtefacts = require("./helpers/artefact");
const artefactRestrictions = require("./helpers/artefactRestrictions");
const {
  mapBusinessCustomerDepartments,
} = require("./helpers/businessCustomerDepartamentMapping");
const {
  formatCustomerDeptInfo,
} = require("./helpers/businessCustomerDepartamentFormatter");
const { getArguments, groupResponse } = require("./helpers/classificator");
const { DEPARTMENT_TO_STREAM_MAPPING } = require("../../common/mapping");

const InstanceService = require("../instance");

class Card {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  getGroupsAfterMapping(userGroups) {
    if (!Array.isArray(userGroups) || userGroups.length === 0) {
      return [];
    }

    if (userGroups.includes("ds")) {
      return userGroups.flatMap(
        (group) => DEPARTMENT_TO_STREAM_MAPPING[group] || group
      );
    }

    if (userGroups.includes("business_customer")) {
      return mapBusinessCustomerDepartments(userGroups);
    }

    return userGroups;
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
    // 1. Вставляем запись в MODELS (без описания, так как поле будет удалено)
    let result;
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
        GENERAL_MODEL_ID: null,
      };
      result = await this.db.execute({ sql: sql.copy, args });
    } else {
      result = await this.db.execute({
        sql: sql.new,
        args: {
          MODEL_ID,
          MODEL_NAME,
          MODEL_DESC,
          MODEL_CREATOR,
          GENERAL_MODEL_ID: null,
        },
      });
    }

    await this.db.execute({
      sql: sql.insert_model_desc_realization,
      args: { MODEL_ID, MODEL_DESC },
    });

    return result;
  };

  createNewByGeneralModelId = async ({
    MODEL_ID,
    MODEL_NAME,
    MODEL_DESC,
    generalModelId,
    MODEL_CREATOR,
  }) => {
    let result;

    const rootModel = await this.db
      .execute({
        sql: sql.rootModelByGeneralModelId,
        args: { general_model_id: generalModelId },
      })
      .then((data) => (data.rowCount > 0 ? data.rows[0] : null));

    if (rootModel) {
      result = await this.db.execute({
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
    } else {
      result = await this.db.execute({
        sql: sql.new,
        args: {
          MODEL_ID,
          MODEL_NAME,
          MODEL_DESC,
          MODEL_CREATOR,
          GENERAL_MODEL_ID: generalModelId,
        },
      });
    }

    if (MODEL_DESC) {
      await this.db.execute({
        sql: sql.insert_model_desc_realization,
        args: { MODEL_ID, MODEL_DESC },
      });
    }

    return result;
  };

  // Получить все карточки по типу
  all = ({ type = [], active }, user) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);

    const args = {
      type,
      active: active ? "1" : "0",
      groups: groupsAfterMapping,
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
      groups: groupsAfterMapping,
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
      BUSINESS_CUSTOMER_DEPARTAMENT: formatCustomerDeptInfo(
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

  editActiveStatus = ({ MODEL_ID, MODELS_IS_ACTIVE_FLG }) =>
    this.db.execute({
      sql: sql.edit_active_status,
      args: { MODEL_ID, MODELS_IS_ACTIVE_FLG },
    });

  editDesc = async ({ MODEL_ID, MODEL_DESC }) => {
    await this.db.execute({
      sql: sql.edit_desc,
      args: { MODEL_ID, MODEL_DESC },
    });

    await this.db.execute({
      sql: sql.update_model_desc_realization,
      args: { MODEL_ID },
    });

    await this.db.execute({
      sql: sql.insert_model_desc_realization,
      args: { MODEL_ID, MODEL_DESC },
    });
  };

  changeStatus = ({ modelId, modelStatus }) =>
    this.db.execute({
      sql: sql.edit_status,
      args: { model_id: modelId, model_status: modelStatus },
    });

  changeStage = ({ modelId, modelStage }) =>
    this.db.execute({
      sql: sql.edit_stage,
      args: { model_id: modelId, model_stage: modelStage },
    });

  // Обновление этапа происходит в транзакции.
  // Запрос selectModelForUpdate блокирует строку на чтение и изменение (FOR UPDATE), чтобы параллельные таски не перетёрли изменения (см. lost update)
  // Блокировка будет действовать пока не завершится транзакция, любые параллельные запросы на чтение for update или изменение будут ждать снятия блокировки и получат обновлённые данные
  addStage = async ({ modelId, modelStage }) => {
    if (!modelStage) {
      return;
    }

    const connection = await this.db.beginTransation();

    try {
      const model = await this.db
        .executeWithConnection({
          connection,
          sql: sql.selectModelForUpdate,
          args: { model_id: modelId },
        })
        .then((data) => {
          if (data.rows.length) {
            return data.rows[0];
          }

          throw Error(`Model with id: ${modelId} not found`);
        });

      let stages = model.MODEL_STAGE ? model.MODEL_STAGE.split(";") : [];
      const currentStageIndex = stages.indexOf(modelStage);
      if (currentStageIndex > -1) {
        // Добавляем этап только если он не был ранее добавлен
        await this.db.rollbackTransaction(connection);
        return;
      }
      stages.push(modelStage);

      await this.db.executeWithConnection({
        connection,
        sql: sql.edit_stage,
        args: {
          model_id: modelId,
          model_stage: stages.join(";"),
        },
      });

      await this.db.commitTransaction(connection);
    } catch (err) {
      console.error(`Unable to add stage ${modelStage} for model ${modelId}`);
      await this.db.rollbackTransaction(connection);
      throw err;
    }
  };

  // Обновление этапа происходит в транзакции.
  // Запрос selectModelForUpdate блокирует строку на чтение и изменение (FOR UPDATE), чтобы параллельные таски не перетёрли изменения (см. lost update)
  // Блокировка будет действовать пока не завершится транзакция, любые параллельные запросы на чтение for update или изменение будут ждать снятия блокировки и получат обновлённые данные
  removeStage = async ({ modelId, modelStage }) => {
    if (!modelStage) {
      return;
    }

    const connection = await this.db.beginTransation();

    try {
      const model = await this.db
        .executeWithConnection({
          connection,
          sql: sql.selectModelForUpdate,
          args: { model_id: modelId },
        })
        .then((data) => {
          if (data.rows.length) {
            return data.rows[0];
          }

          throw Error(`Model with id: ${modelId} not found`);
        });

      if (!model.MODEL_STAGE) {
        console.error(
          `Tried to remove stage ${modelStage} from model ${modelId} but model.MODEL_STAGE is empty`
        );
        await this.db.rollbackTransaction(connection);
        return;
      }

      let stages = model.MODEL_STAGE.split(";");
      const deleteIndex = stages.indexOf(modelStage);
      if (deleteIndex > -1) {
        stages.splice(deleteIndex, 1);
      }

      this.db.executeWithConnection({
        connection,
        sql: sql.edit_stage,
        args: {
          model_id: modelId,
          model_stage: stages.length ? stages.join(";") : null,
        },
      });

      await this.db.commitTransaction(connection);
    } catch (err) {
      console.error(
        `Unable to remove stage ${modelStage} from model ${modelId}`
      );
      await this.db.rollbackTransaction(connection);
      throw err;
    }
  };

  /**
   * Validates the consistency of a model's state between the database and Camunda.
   *
   * This method performs the following checks:
   * 1. Ensures the main process instance exists in Camunda.
   * 2. Verifies that the status of the main process instance in the database matches its status in Camunda.
   * 3. Confirms that all active subprocess instances in the database exist in Camunda.
   * 4. Ensures that all subprocess instances in Camunda have the correct activity status based on the database.
   *
   * If any of these checks fail, an error object is returned with an appropriate error message.
   *
   * @param {string} modelId - The unique identifier of the model (corresponding to the super process instance ID).
   * @returns {Promise<Object>} - A promise that resolves to an object containing either:
   *   - `{ error: false }` if all checks pass, or
   *   - `{ error: true, errorMessage: string }` if a validation check fails.
   */
  validateModelStateConsistency = async (modelId) => {
    try {
      console.log("Start model validation...");

      // 1. Check that main process instance exists in Camunda
      const mainProcessInstance = await this.bpmn.getProcessInstance(modelId);
      if (!mainProcessInstance) {
        return {
          error: true,
          errorMessage: `Camunda. Main process instance - ${modelId} is not exist.`,
        };
      }

      console.log("1/5. Pass. Main process instance exists in Camunda");

      // 2. Verify if the main process instance status in the DB matches the status in Camunda
      const { MODELS_IS_ACTIVE_FLG } = await this.info({
        MODEL_ID: modelId,
      });
      const isModelActive = MODELS_IS_ACTIVE_FLG === "1" ? true : false;

      if (mainProcessInstance.suspended === isModelActive) {
        const errorMessage = `Mismatch statuses. Model: ${modelId} is ${
          isModelActive ? "active" : "not active"
        } in DB, but ${
          mainProcessInstance.suspended ? "suspended" : "active"
        } in Camunda.`;
        return {
          error: true,
          errorMessage,
        };
      }

      console.log(
        "2/5. Pass. Main process instance status in DB matches the status in Camunda"
      );

      // 3. Verify that all active process instances in DB exist in Camunda
      // Get all existed model sub instances from camunda
      const camundaInstances = await this.bpmn.getAllSubProcessInstances({
        superProcessInstanceId: modelId,
      });

      const Instance = new InstanceService(this.db);
      // Get all (except 'cancel') active model sub instances from bpmn_instances
      const dbInstances = await Instance.model({ model: modelId });
      const dbInstanceIds = dbInstances.map(
        ({ BPMN_INSTANCE_ID }) => BPMN_INSTANCE_ID
      );

      if (!camundaInstances.every(({ id }) => dbInstanceIds.includes(id))) {
        return {
          error: true,
          errorMessage: `Mismatch between database records and Camunda state.`,
        };
      }

      console.log(
        "3/5. Pass. All active process instances in DB exist in Camunda"
      );

      // 4. Check that process instances in Camunda have correct status of activity
      if (
        camundaInstances.some(({ suspended }) => suspended === isModelActive)
      ) {
        return {
          error: true,
          errorMessage: `Mismatch statuses. Model: ${modelId} is ${
            isModelActive ? "active" : "not active"
          } in DB, but one of subprocesses in Camunda ${
            isModelActive ? "suspended" : "not suspended"
          }.`,
        };
      }

      console.log(
        "4/5. Pass. Process instances in Camunda have correct status of activity"
      );

      // 5. Ensure no subprocess in Camunda is missing from the database
      const orphanedInstances = camundaInstances.filter(
        (instance) => !dbInstanceIds.includes(instance.id)
      );
      if (orphanedInstances.length > 0) {
        return {
          error: true,
          errorMessage: `Orphaned subprocess instances found in Camunda: ${orphanedInstances
            .map((instance) => instance.id)
            .join(", ")}.`,
        };
      }

      console.log(
        "5/5. Pass. No subprocess in Camunda is missing from the database. Validation complete."
      );

      // If all checks pass, return success
      return { error: false };
    } catch (e) {
      return {
        error: true,
        errorMessage: `Error while validating model state: ${e.message}`,
      };
    }
  };
}

module.exports = Card;
