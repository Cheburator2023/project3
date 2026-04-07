require('dotenv').config();
// const { acquireStageAndStatusFromCamunda } = require("../src/common/status-helpers");
const models = require("../src/models");
const bpmn = require('../src/connectors/bpmn');
const database = require('../src/connectors/database');
const integration = require('../src/connectors/integration');

const querystring = require("querystring");

const historyTasksByModel = (modelId, sortBy = 'endTime', sortOrder = 'desc', bpmn) =>
    bpmn.connector({
      path: `/history/task?${querystring.stringify({
        sortBy: sortBy,
        sortOrder: sortOrder,
        processVariables: "model_eq_" + modelId,
      })}`,
    });

const historyExternalTasksByInstanceId = (processInstanceId, successLog = true, sortBy = 'timestamp', sortOrder = 'desc', bpmn) =>
    bpmn.connector({
      path: `/history/external-task-log?${querystring.stringify({
        sortBy: sortBy,
        sortOrder: sortOrder,
        processInstanceId: processInstanceId,
        successLog: successLog,
      })}`,
    });

const historyProcessInstancesByModel = (modelId, sortBy = 'endTime', sortOrder = 'desc', bpmn) => 
    bpmn.connector({
      path: `/history/process-instance?${querystring.stringify({
        sortBy: sortBy,
        sortOrder: sortOrder,
        variables: "model_eq_" + modelId,
      })}`,
    });

const versionTags = [];

const { modelStatusAndStageByTask } = require('../src/models/task/sql');
// переработанная копия из ../src/models/task/index
const getStatusStageMapByTask = async(taskId, processDefinitionId, context) => {
    const definition = await context.bpmn.definition(processDefinitionId);

    if (!definition) {
        console.error(`Cannot get definition by id ${processDefinitionId} on getStatusStageMapByTask for task ${taskId}`);
        return null;
    }

    if (!versionTags.find((e) => e == definition.versionTag)) {
        versionTags.push(definition.versionTag);
    }

    return await database.execute({
        sql: modelStatusAndStageByTask,
        args: {
            task_id: taskId,
            key: definition.key,
            version_tag: definition.versionTag
        },
    })
    .then((data) => data.rows);
};

// переработанная копия из ../src/common/status-helpers
const acquireStageAndStatusFromCamunda = async (id, taskId, processDefinitionId, variables, context) => {
  let modelStatus = null;
  let modelStage = null;

  // Пробуем получить этап и статус из переменных Камунды (новые схемы)
  modelStatus = variables ? variables.model_status : await context.bpmn.getTaskVar(id, 'model_status');
  modelStage = variables ? variables.model_stage : await context.bpmn.getTaskVar(id, 'model_stage');

  if (!modelStatus && !modelStage) {
    // Не получили из переменных, пробуем найти в маппинге по текущей activity (user task или external task)
    let stageStatusMap = await getStatusStageMapByTask(taskId, processDefinitionId, context);

    if (stageStatusMap.length > 1) {
      // скорее всего есть дополнительные признаки, переменные по которым нужно выбрать точный вариант маппинга
      const model_deployment_approving_flg = await context.bpmn.getTaskVar(id, 'model_deployment_approving_flg');
      const pim_integration_flg = await context.bpmn.getTaskVar(id, 'pim_integration_flg');

      stageStatusMap = stageStatusMap.filter((item) => {
        if (item.MODEL_DEPLOYMENT_APPROVING_FLG && item.MODEL_DEPLOYMENT_APPROVING_FLG !== model_deployment_approving_flg) {
          return false;
        }
        if (item.PIM_INTEGRATION_FLG && item.PIM_INTEGRATION_FLG !== pim_integration_flg) {
          return false;
        }
        return true;
      })
    }

    if (stageStatusMap[0]) {
      modelStatus = stageStatusMap[0].MODEL_STATUS;
      modelStage = stageStatusMap[0].MODEL_STAGE;
    } else {
      console.log(`Run Error. Ошибка получения статуса/этапа из Камунды. task ${id} taskId ${taskId} process definition ${processDefinitionId}`)
    }
  }

  return {modelStage: modelStage, modelStatus: modelStatus};
}

class Stage {
    constructor(stage, effectiveFrom, effectiveTo) {
        this._stage = stage;
        this._effectiveFrom = effectiveFrom;
        this._effectiveTo = effectiveTo ? effectiveTo : '9999-12-31T23:59:59.000+0000';
    }

    get stage() { return this._stage }
    get effectiveFrom() { return this._effectiveFrom }
    get effectiveTo() { return this._effectiveTo }

    setEffectiveTo(effectiveTo) {
        this._effectiveTo = effectiveTo;
    }
}

class Status {
    constructor(status, effectiveFrom, effectiveTo) {
        this._status = status;
        this._effectiveFrom = effectiveFrom;
        this._effectiveTo = effectiveTo ? effectiveTo : '9999-12-31T23:59:59.000+0000';
    }

    get status() { return this._status }
    get effectiveFrom() { return this._effectiveFrom }
    get effectiveTo() { return this._effectiveTo }

    setEffectiveTo(effectiveTo) {
        this._effectiveTo = effectiveTo;
    }
}

class Model {
    constructor(modelId, rootModelId, modelVersion) {
        this._modelId = modelId;
        this._rootModelId = rootModelId;
        this._modelVersion = modelVersion;
        this._statuses = [];
        this._stages = [];
    }

    get modelId() { return this._modelId }
    get rootModelId() { return this._rootModelId }
    get modelVersion() { return this._modelVersion }
    get statuses() { return this._statuses }
    get stages() { return this._stages }

    addStatus(status) {
        const lastStatus = this.getLastStatus();
        if (lastStatus && lastStatus.status === status.status) {
            lastStatus.setEffectiveTo(status.effectiveTo);
        } else {
            this._statuses.push(status);
        }
    }
    
    getLastStatus() {
        return this._statuses[this._statuses.length - 1];
    }

    getCurrentStatusString() {
        const lastStatus = this.getLastStatus();
        return lastStatus ? lastStatus.status : null;
    }

    addStage(stage) {
        const lastStage = this.getLastStage();
        if (lastStage && lastStage.stage === stage.stage) {
            lastStage.setEffectiveTo(stage.effectiveTo);
        } else {
            this._stages.push(stage);
        }
    }

    getLastStage() {
        return this._stages[this._stages.length - 1];
    }

    getCurrentStageString() {
        const activeStages = this._stages.filter((stage) => stage.effectiveTo === '9999-12-31T23:59:59.000+0000');
        if (activeStages.length === 0) {
            return null;
        }
        return activeStages.map(s => s.stage).join(';');
    }
}

class ModelSaver {
    constructor(database) {
        this._database = database;
    }

    flush(model) {
        // console.log('=============TEST modelData ', model);
        this._insertModel(model.modelId, model.rootModelId, model.modelVersion, model.getCurrentStageString(), model.getCurrentStatusString());
        for (const status of model.statuses) {
            this._insertModelStatus(model.modelId, status.status, status.effectiveFrom, status.effectiveTo);
        }
        for (const stage of model.stages) {
            this._insertModelStage(model.modelId, stage.stage, stage.effectiveFrom, stage.effectiveTo);
        }
    }

    async _insertModel(modelId, rootModelId, modelVersion, stage, status) {
        await this._database.execute({
            sql: `INSERT INTO models_tmp_v2 (model_id, root_model_id, model_version, model_status, model_stage)
                VALUES (:model_id, :root_model_id, :model_version, :model_status, :model_stage)
                ON CONFLICT DO NOTHING`,
            args: { model_id: modelId, root_model_id: rootModelId, model_version: modelVersion, model_status: status, model_stage: stage },
        });
    }

    async _insertModelStatus(modelId, status, effectiveFrom, effectiveTo) {
        await this._database.execute({
            sql: `INSERT INTO model_status_tmp_v2 (model_id, status, effective_from, effective_to)
            VALUES (:model_id, :status, TO_TIMESTAMP(:effective_from, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'), TO_TIMESTAMP(:effective_to, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'))`,
            args: { model_id: modelId, status: status, effective_from: effectiveFrom, effective_to: effectiveTo },
        });
    }

    async _insertModelStage(modelId, stage, effectiveFrom, effectiveTo) {
        await this._database.execute({
            sql: `INSERT INTO model_stage_tmp_v2 (model_id, stage, effective_from, effective_to)
            VALUES (:model_id, :stage, TO_TIMESTAMP(:effective_from, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'), TO_TIMESTAMP(:effective_to, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'))`,
            args: { model_id: modelId, stage: stage, effective_from: effectiveFrom, effective_to: effectiveTo },
        });
    }
}

const getModels = async (limit, database, failedModelIds) => {
    return database.execute({
            sql: `select * 
                from models m
                where m.model_status is null 
                    and m.model_stage is null 
                    and m.model_id <> ALL (:failed_ids)
                    and m.model_desc <> 'AutoML'
                    and not exists(select mt.model_id from models_tmp_v2 mt where m.model_id = mt.model_id)
                    and exists (select bi.bpmn_instance_id from bpmn_instances bi where m.model_id = bi.model_id)
                limit :limit`,
            args: { limit: limit, failed_ids: failedModelIds },
        })
    .then((data) => data.rows);
}

const getLastProcessInstanceFromList = (list) => {
    return list.find((el) => el.processDefinitionKey !== 'main');
}

const processModel = async (model, bpmn, db) => {
    const tasks = await historyTasksByModel(model.MODEL_ID, 'startTime', 'asc', bpmn);
    const modelData = new Model(model.MODEL_ID, model.ROOT_MODEL_ID, model.MODEL_VERSION);
    let activeTaskExists = false;

    if (tasks.length == 0) {
        // TODO Нужно ли как-то обрабатывать ситуации, если история не собралась вообще, т.е. исторических юзер тасок нет?
        console.log(`Run Error. Не удалось получить задачи по модели ${model.MODEL_ID}`);
        return;
    }

    for (const task of tasks) {
        if (!task.endTime) {
            activeTaskExists = true;
        }

        const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
            task.id,
            task.taskDefinitionKey,
            task.processDefinitionId,
            { model_status: null, model_stage: null },
            { bpmn: bpmn, db: db }
        );

        if (modelStage) {
            modelData.addStage(new Stage(modelStage, task.startTime, task.endTime));
        }

        if (modelStatus) {
            modelData.addStatus(new Status(modelStatus, task.startTime, task.endTime));
        }

        if (modelStatus || modelStage) {
            console.log(`Добавлены исторические этапы и статусы по модели ${model.MODEL_ID}`);
        } else {
            console.log(`Run Error. Не удалось получить этапы и статусы по модели ${model.MODEL_ID} задача ${task.id}`);
        }
    }
    
    // Обработать финальные статусы по external task для моделей с завершёнными процессами
    const processInstances = await historyProcessInstancesByModel(model.MODEL_ID, 'endTime', 'desc', bpmn);
    const lastProcessInstance = getLastProcessInstanceFromList(processInstances);
    let task = null;

    if (!activeTaskExists && lastProcessInstance.state === 'ACTIVE') {
        // Есть активный не main процесс и активная user task отсутствует. Скорее всего процесс завис, пробуем получить текущую активную external task
        const exHistoryTasks = await historyExternalTasksByInstanceId(lastProcessInstance.id, false, 'timestamp', 'desc', bpmn);

        if (exHistoryTasks.length && exHistoryTasks[0].successLog === false) {
            task = exHistoryTasks[0];
        } else {
            console.log(`Run Error. У модели нет активной задачи, есть активный процесс и не удалось найти external task ${model.MODEL_ID}`);
        }
    } else {
        // Если процесс завершён, то получаем external task из истории.
        const tasks = await historyExternalTasksByInstanceId(lastProcessInstance.id, true, 'timestamp', 'desc', bpmn);
        task = tasks.find((el) => el.topicName === 'bpmnFinish');
    }

    if (task) {
        const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
            task.externalTaskId,
            task.activityId,
            task.processDefinitionId,
            { model_status: null, model_stage: null },
            { bpmn: bpmn, db: db }
        );

        if (modelStage && task.topicName !== 'bpmnFinish') { // Этап устанавливать не нужно, если мы берём bpmnFinish
            modelData.addStage(new Stage(modelStage, task.timestamp, null));
        }

        if (modelStatus) {
            modelData.addStatus(new Status(modelStatus, task.timestamp, null));
        }

        if (modelStatus || modelStage) {
            console.log(`Добавлены данные external task по модели ${model.MODEL_ID}`);
        } else {
            console.log(`Run Error. Не удалось получить этапы и статусы по модели ${model.MODEL_ID} external task ${task.externalTaskId}`);
        }
    }

    if (modelData.statuses.length || modelData.stages.length) {
        return modelData;
    } else {
        return;
    }
}

const initialize = async () => {
    await database.execute({
        sql: `CREATE TABLE IF NOT EXISTS models_tmp_v2 (
            root_model_id numeric(38) NOT NULL,
            model_version numeric(38) DEFAULT 1 NULL,
            model_id varchar(4000) NOT NULL,
            model_status varchar NULL,
            model_stage varchar NULL,
            CONSTRAINT models_tmp_v2_pkey PRIMARY KEY (model_id)
        );
        
        CREATE TABLE IF NOT EXISTS model_stage_tmp_v2 (
            id serial4 NOT NULL,
            model_id varchar(4000) NOT NULL,
            stage varchar NULL,
            effective_from timestamp DEFAULT CURRENT_TIMESTAMP(0) NULL,
            effective_to timestamp DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text) NULL,
            CONSTRAINT model_stage_tmp_v2_pkey PRIMARY KEY (id)
        );
        
        CREATE TABLE IF NOT EXISTS model_status_tmp_v2 (
            id serial4 NOT NULL,
            model_id varchar(4000) NOT NULL,
            status varchar NULL,
            effective_from timestamp DEFAULT CURRENT_TIMESTAMP(0) NULL,
            effective_to timestamp DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text) NULL,
            CONSTRAINT model_status_tmp_v2_pkey PRIMARY KEY (id)
        );`
    });
}

const main = async (batchSize = 100, batchesCount = 0) => {
    let countModelsOverall = 0;
    let failedModelIds = [];
    await database.initialize();
    const db = models(database, bpmn, integration);
    const modelSaver = new ModelSaver(database);

    await initialize();

    let modelsList = await getModels(batchSize, database, failedModelIds);

    let countIterations = 0;
    while (modelsList.length) {
        for (const model of modelsList) {
            console.log(`Обработка модели ${model.MODEL_ID}`);
            const modelData = await processModel(model, bpmn, db);
            if (modelData) {
                console.log(`Сохранение данных модели ${modelData.modelId}`);
                modelSaver.flush(modelData);
            } else {
                console.log(`Пропуск. ${model.MODEL_ID}`);
                failedModelIds.push(model.MODEL_ID);
            }
            countModelsOverall += 1;
        }

        countIterations++;
        if (batchesCount > 0 && countIterations >= batchesCount) {
            break;
        }
        modelsList = await getModels(batchSize, database, failedModelIds);
    }

    console.log(`Обработка завершена успешно. Всего моделей ${countModelsOverall}. Из них с ошибкой ${failedModelIds.length} \n version tags ${versionTags}`);
}

const args = process.argv.slice(2);
main(args[0] ? args[0] : 100, args[1] ? args[1] : 0);
