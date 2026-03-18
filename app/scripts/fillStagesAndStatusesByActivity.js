require('dotenv').config();
const { acquireStageAndStatusFromCamunda } = require("../src/common/status-helpers");
const models = require("../src/models");
const bpmn = require('../src/connectors/bpmn');
const database = require('../src/connectors/database');
const integration = require('../src/connectors/integration');

let failedModelIds = [];
let countModelsOverall = 0;

const getModels = async (limit, database) => {
    return database.execute({
            sql: `select * 
                from models m
                where m.model_status is null 
                    and m.model_stage is null 
                    and m.model_id <> ALL (:failed_ids)
                    and m.model_desc <> 'AutoML'
                    and not exists(select mt.model_id from models_tmp mt where m.model_id = mt.model_id)
                    and exists (select bi.bpmn_instance_id from bpmn_instances bi where m.model_id = bi.model_id)
                limit :limit`,
            args: { limit: limit, failed_ids: failedModelIds },
        })
    .then((data) => data.rows);
}

const setCurrentStageAndStatusByTask = async (model, task, bpmn, db, database, setStage = true, setStatus = true) => {
    const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
        task.externalTaskId ? task.externalTaskId : task.id,
        task.taskDefinitionKey ? task.taskDefinitionKey :task.activityId,
        task.processDefinitionId,
        {model_stage: null, model_status: null},
        {
            bpmn: bpmn,
            db: db,
        }
    );

    let startDateTime = task.created || task.timestamp || new Date().toISOString();
    // startDateTime = new Date(startDateTime);
    console.log('===================TEST startDateTime: ', startDateTime)

    await database.execute({
        sql: `INSERT INTO models_tmp (model_id, root_model_id, model_version)
            VALUES (:model_id, :root_model_id, :model_version)
            ON CONFLICT DO NOTHING`,
        args: { model_id: model.MODEL_ID, root_model_id: model.ROOT_MODEL_ID, model_version: model.MODEL_VERSION },
    });

    if (setStatus && modelStatus) {
        await database.execute({
            sql: `UPDATE models_tmp SET model_status = COALESCE(:model_status, model_status)
                WHERE model_id = :model_id`,
            args: { model_id: model.MODEL_ID, model_status: modelStatus },
            });

        await database.execute({
            sql: `
                INSERT INTO model_status_tmp (model_id, status, effective_from, effective_to)
                VALUES (:model_id, :status, TO_TIMESTAMP(:effective_from, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'), TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'))
            `,
            args: { model_id: model.MODEL_ID, status: modelStatus, effective_from: startDateTime },
        });
    }

    if (setStage && modelStage) {
        await database.execute({
            sql: `UPDATE models_tmp SET model_stage = CONCAT_WS(';', model_stage, :model_stage::text)
                WHERE model_id = :model_id`,
            args: { model_stage: modelStage, model_id: model.MODEL_ID },
            });

        await database.execute({
            sql: `
                INSERT INTO model_stage_tmp (model_id, stage, effective_from, effective_to)
                VALUES (:model_id, :stage, :effective_from, TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'))
            `,
            args: { model_id: model.MODEL_ID, stage: modelStage, effective_from: startDateTime  },
        });
    }
}

const addHistoryLogByTask = async (model, task, bpmn, db, database) => {
    if (!task.endTime) {
        console.log('===================TEST got active task, skipping ')
        return;
    }

    const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
        task.externalTaskId ? task.externalTaskId : task.id,
        task.taskDefinitionKey ? task.taskDefinitionKey : task.activityId,
        task.processDefinitionId,
        {model_stage: null, model_status: null},
        {
            bpmn: bpmn,
            db: db,
        }
    );
console.log('===================TEST acquireStageAndStatusFromCamunda: ', modelStage, modelStatus)
    if (modelStatus) {
        const lastHistoricStatus = await database.execute({
            sql: `SELECT * FROM model_status_tmp ms WHERE ms.model_id = :model_id 
                AND effective_to < TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
            ORDER BY ms.effective_to DESC 
            LIMIT 1`,
            args: { model_id: model.MODEL_ID },
        }).then((data) => data.rows[0]);

        if (lastHistoricStatus && lastHistoricStatus.STATUS == modelStatus) {
            await database.execute({
                sql: `UPDATE model_status_tmp
                SET effective_to = TO_TIMESTAMP(:to_date, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM')
                WHERE id = :id`,
                args: { id: lastHistoricStatus.ID, to_date: task.endTime },
            });
        } else {
            await database.execute({
                sql: `INSERT INTO model_status_tmp (model_id, status, effective_from, effective_to)
                VALUES (:model_id, :status, TO_TIMESTAMP(:from_date, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'), TO_TIMESTAMP(:to_date, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'))`,
                args: { model_id: model.MODEL_ID, status: modelStatus, from_date: task.startTime, to_date: task.endTime },
            });
        }
    }

    if (modelStage) {
        const lastHistoricStage = await database.execute({
            sql: `SELECT * FROM model_stage_tmp ms WHERE ms.model_id = :model_id 
                AND effective_to < TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
            ORDER BY ms.effective_to DESC 
            LIMIT 1`,
            args: { model_id: model.MODEL_ID },
        }).then((data) => data.rows[0]);

        if (lastHistoricStage && lastHistoricStage.STAGE == modelStage) {
            await database.execute({
                sql: `UPDATE model_stage_tmp 
                SET effective_to = TO_TIMESTAMP(:to_date, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM')
                WHERE id = :id`,
                args: { id: lastHistoricStage.ID, to_date: task.endTime },
            });
        } else {
            await database.execute({
                sql: `INSERT INTO model_stage_tmp (model_id, stage, effective_from, effective_to)
                VALUES (:model_id, :stage, TO_TIMESTAMP(:from_date, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'), TO_TIMESTAMP(:to_date, 'YYYY-MM-DDXHH24:MI:SS.MSTZHTZM'))`,
                args: { model_id: model.MODEL_ID, stage: modelStage, from_date: task.startTime, to_date: task.endTime },
            });
        }
    }
}

const getLastBpmnInstance = async (modelId, database) => {
    return lastInstance = await database.execute({
            sql: `SELECT * FROM bpmn_instances bi WHERE bi.model_id = :model_id 
                ORDER BY bi.effective_from DESC 
                LIMIT 1`,
            args: { model_id: modelId },
    }).then((data) => data.rows[0]);
}

const checkIfStatusIsSet = async (modelId, database) => {
    const model = await database.execute({
            sql: `SELECT * FROM models_tmp mt WHERE mt.model_id = :model_id`,
            args: { model_id: modelId },
    }).then((data) => data.rows[0]);

    return model.MODEL_STATUS;
}

const getActiveInstanceFromList = (list) => {
    return list.filter((el) => el.state === 'ACTIVE' && el.processDefinitionKey !== 'main')[0];
}

const getLastCompletedInstanceFromList = (list) => {
    return list.filter((el) => el.state === 'COMPLETED' && el.processDefinitionKey !== 'main')[0];
}

const setCurrentStatusByLast = async (modelId, database) => {
    const lastStatus = await database.execute({
        sql: `SELECT * FROM model_status_tmp mst 
        WHERE mst.model_id = :model_id
        ORDER BY effective_to DESC
        LIMIT 1`,
        args: { model_id: modelId },
    }).then((data) => data.rows[0]);

    if (!lastStatus) {
        console.log(`Не удалось установить текущий статус модели: нет статусов в истории ${modelId}`);
        return;
    }

    await database.execute({
        sql: `UPDATE models_tmp SET model_status = COALESCE(:model_status, model_status)
            WHERE model_id = :model_id`,
        args: { model_id: modelId, model_status: lastStatus.STATUS },
    });

    console.log(`Добавлен статус по модели ${modelId}`);
}

const processModel = async (model, bpmn, db, database) => {
    let tasks = await bpmn.tasksByModel(model.MODEL_ID);
    let setStage = true;
    const processInstances = await bpmn.historyProcessInstancesByModel(model.MODEL_ID, 'endTime', 'desc');
    const activeProcessInstance = getActiveInstanceFromList(processInstances);
    const completedProcessInstance = getLastCompletedInstanceFromList(processInstances);

    if (tasks.length == 0) {
        if (activeProcessInstance) {
            // User task отсутствуют, но есть активный не main процесс. Скорее всего он завис, значит пробуем получить текущую активную external task
            tasks = await bpmn.externalTasksByInstanceId(activeProcessInstance.id);
            tasks.splice(1);
            if (tasks[0].topicName === 'bpmnFinish') {
                // Для случая процесса, зависшего на Завершении бизнес-процесса
                setStage = false;
            }
            // TODO ещё один запрос в external task log по externalTaskId, чтобы по записи creationLog = true получить timestamp. Может сразу из лога получать нужную запись?
        } else if (completedProcessInstance) {
            // Если процесс завершён, то получаем external task из истории. Важно, этап устанавливать не нужно, поскольку мы берём bpmnFinish
            tasks = await bpmn.historyExternalTasksByInstanceId(completedProcessInstance.id);
            setStage = false;
            tasks = tasks.filter((el) => el.topicName === 'bpmnFinish');
        }
    }

    if (tasks.length == 0) {
        console.log(`Пропуск. Не удалось получить актуальные задачи по модели ${model.MODEL_ID}`);
        failedModelIds.push(model.MODEL_ID);
        return;
    }

    for (const task of tasks) {
        await setCurrentStageAndStatusByTask(model, task, bpmn, db, database, setStage);
        console.log(`Добавлены текущие этап и статус по модели ${model.MODEL_ID}`);
    }

    // fill historical stages and statuses
    const historyTasks = await bpmn.historyTasksByModel(model.MODEL_ID, 'startTime', 'asc');

    for (const task of historyTasks) {
        await addHistoryLogByTask(model, task, bpmn, db, database);
        console.log(`Добавлены исторические этапы и статусы по модели ${model.MODEL_ID}`);
    }

    // Если статус не установился, то брать последний статус из истории, и устанавливать в models_tmp
    if (!await checkIfStatusIsSet(model.MODEL_ID, database)) {
        await setCurrentStatusByLast(model.MODEL_ID, database);
    }
}

const initialize = async () => {
    await database.execute({
        sql: `CREATE TABLE IF NOT EXISTS models_tmp (
            root_model_id numeric(38) NOT NULL,
            model_version numeric(38) DEFAULT 1 NULL,
            model_id varchar(4000) NOT NULL,
            model_status varchar NULL,
            model_stage varchar NULL,
            CONSTRAINT models_tmp_pkey PRIMARY KEY (model_id)
        );
        
        CREATE TABLE IF NOT EXISTS model_stage_tmp (
            id serial4 NOT NULL,
            model_id varchar(4000) NOT NULL,
            stage varchar NULL,
            effective_from timestamp DEFAULT CURRENT_TIMESTAMP(0) NULL,
            effective_to timestamp DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text) NULL,
            CONSTRAINT model_stage_tmp_pkey PRIMARY KEY (id)
        );
        
        CREATE TABLE IF NOT EXISTS model_status_tmp (
            id serial4 NOT NULL,
            model_id varchar(4000) NOT NULL,
            status varchar NULL,
            effective_from timestamp DEFAULT CURRENT_TIMESTAMP(0) NULL,
            effective_to timestamp DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text) NULL,
            CONSTRAINT model_status_tmp_pkey PRIMARY KEY (id)
        );`
    });
}

const main = async (batchSize = 100, batchesCount = 0) => {
    await database.initialize();
    const db = models(database, bpmn, integration);

    await initialize();

    let modelsList = await getModels(batchSize, database);

    let countIterations = 0;
    while (modelsList.length) {
        for (const model of modelsList) {
            console.log(`Обработка модели ${model.MODEL_ID}`);
            await processModel(model, bpmn, db, database);
            countModelsOverall += 1;
        }

        countIterations++;
        if (batchesCount > 0 && countIterations >= batchesCount) {
            break;
        }
        modelsList = await getModels(batchSize, database);
    }

    console.log(`Обработка завершена успешно. Всего моделей ${countModelsOverall}. Из них с ошибкой ${failedModelIds.length}`);
}

const args = process.argv.slice(2);
main(args[0] ? args[0] : 100, args[1] ? args[1] : 0);
