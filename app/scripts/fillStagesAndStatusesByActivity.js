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
                    and not exists(select mt.model_id from models_tmp mt where m.model_id = mt.model_id)
                    and exists (select bi.bpmn_instance_id from bpmn_instances bi where m.model_id = bi.model_id)
                limit :limit`,
            args: { limit: limit, failed_ids: failedModelIds },
        })
    .then((data) => data.rows);
}

const setCurrentStageAndStatusByTask = async (model, task, bpmn, db, database) => {
    const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
        task.id,
        task.taskDefinitionKey,
        task.processDefinitionId,
        null,
        {
            bpmn: bpmn,
            db: db,
        }
    );

    await database.execute({
        sql: `INSERT INTO models_tmp (model_id, root_model_id)
            VALUES (:model_id, :root_model_id)`,
        args: { model_id: model.MODEL_ID, root_model_id: model.ROOT_MODEL_ID },
    });

    if (modelStatus) {
        await database.execute({
            sql: `UPDATE models_tmp SET model_status = :model_status
                WHERE model_id = :model_id`,
            args: { model_id: model.MODEL_ID, model_status: modelStatus },
            });

        await database.execute({
            sql: `
                INSERT INTO model_status_tmp (model_id, status, effective_from, effective_to)
                VALUES (:model_id, :status, current_timestamp(0), TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'))
            `,
            args: { model_id: model.MODEL_ID, status: modelStatus },
        });

        // db.card.changeStatus({ modelId: model.MODEL_ID, modelStatus })
        //     .then()
        //     .catch((err) => console.log(`Ошибка при смене статуса модели ${model.MODEL_ID}: ${err}`));
    }

    if (modelStage) {
        await database.execute({
            sql: `UPDATE models_tmp SET model_stage = :model_stage
                WHERE model_id = :model_id`,
            args: { model_id: model.MODEL_ID, model_stage: modelStage },
            });

        await database.execute({
            sql: `
                INSERT INTO model_stage_tmp (model_id, stage, effective_from, effective_to)
                VALUES (:model_id, :stage, current_timestamp(0), TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS'))
            `,
            args: { model_id: model.MODEL_ID, stage: modelStage },
        });

        // db.card.addStage({ modelId: model.MODEL_ID, modelStage })
        //     .then()
        //     .catch((err) => console.log(`Ошибка при смене этапа модели ${model.MODEL_ID}: ${err}`));
    }
}

const addHistoryLogByTask = async (model, task, bpmn, db, database) => {
    if (!task.endTime) {
        return;
    }

    const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
        task.id,
        task.taskDefinitionKey,
        task.processDefinitionId,
        null,
        {
            bpmn: bpmn,
            db: db,
        }
    );

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
                args: { model_id: model.MODEL_ID, stage: modelStage, from_date: task.startTime, to_date: task.endTLfime },
            });
        }
    }
}

const processModel = async (model, bpmn, db, database) => {
    let tasks = await bpmn.tasksByModel(model.MODEL_ID);

    if (tasks.length == 0) {
       tasks = await bpmn.externalTasksByInstanceId(model.BPMN_INSTANCE_ID);
    }

    if (tasks.length == 0) {
        console.log(`Пропуск. Не удалось получить активные задачи по модели ${model.MODEL_ID}`);
        failedModelIds.push(model.MODEL_ID);
    }

    for (const task of tasks) {
        await setCurrentStageAndStatusByTask(model, task, bpmn, db, database);
        console.log(`Добавлены текущие этап и статус по модели ${model.MODEL_ID}`);
    }

    // fill historical stages and statuses
    const historyTasks = await bpmn.historyTasksByModel(model.MODEL_ID);

    for (const task of historyTasks) {
        await addHistoryLogByTask(model, task, bpmn, db, database);
        console.log(`Добавлены исторические этапы и статусы по модели ${model.MODEL_ID}`);
    }
}

const initialize = async () => {
    await database.execute({
        sql: `CREATE TABLE IF NOT EXISTS models_tmp (
            root_model_id numeric(38) NOT NULL,
            model_id varchar(4000) NOT NULL,
            model_status varchar NULL,
            model_stage varchar NULL
        );
        
        CREATE TABLE IF NOT EXISTS model_stage_tmp (
            id serial4 NOT NULL,
            model_id varchar(4000) NOT NULL,
            stage varchar NULL,
            effective_from timestamp DEFAULT CURRENT_TIMESTAMP(0) NULL,
            effective_to timestamp DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text) NULL
        );
        
        CREATE TABLE IF NOT EXISTS model_status_tmp (
            id serial4 NOT NULL,
            model_id varchar(4000) NOT NULL,
            status varchar NULL,
            effective_from timestamp DEFAULT CURRENT_TIMESTAMP(0) NULL,
            effective_to timestamp DEFAULT to_timestamp('9999-12-3123:59:59'::text, 'YYYY-MM-DDHH24:MI:SS'::text) NULL
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