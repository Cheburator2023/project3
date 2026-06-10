const getUserName = require("../card/helpers");
const { acquireStageAndStatusFromCamunda } = require("../../../../../common/status-helpers");
const auditClient = require('../../../../../utils/audit/auditClient');

module.exports = async (root, args, context) => {
    // Формирование информации об инициаторе для аудита
    const initiatorInfo = {
        sub: context.user?.preferred_username || context.user?.username || 'system',
        realm: context.user?.realm || 'staff',
        channel: 'graphql',
        url: '/graphql/mutation/taskComplete',
        method: 'taskComplete',
        sourceIp: context.req?.ip || '127.0.0.1'
    };
    let correlationId;

    try {
        // Get Task Info
        const taskInfo = await context.db
            .task
            .one(args, context.user);

        // Старт аудита – начало операции закрытия задачи
        correlationId = await auditClient.start(
            'SUMD_TASKCOMPLETE',
            initiatorInfo,
            { taskId: args.id, taskName: taskInfo?.TASK_NAME, modelId: taskInfo?.MODEL?.MODEL_ID }
        );

        // --- Ensure ARTEFACTS array ---
        if (!Array.isArray(args.ARTEFACTS)) {
            args.ARTEFACTS = []
        }

        // --- Add assignment_contractor artefact for specific tasks ---
        const contractorTasks = new Set([
            'data_source_analysis_and_need_involve_de',
            'development_results_approving',
            'filling_info_model_dev',
        ])

        if (contractorTasks.has(taskInfo.TASK_ID)) {
            console.log(taskInfo.TASK_ID, 'taskInfo.TASK_ID')
            args.ARTEFACTS.push({
                ARTEFACT_ID: 687,
                ARTEFACT_ORIGINAL_VALUE: null,
                ARTEFACT_STRING_VALUE: getUserName(context.user),
                ARTEFACT_TECH_LABEL: 'assignment_contractor',
            })
        }

        // Close artefact_realization version
        const updateArtefactArgs = {
            MODEL_ID: taskInfo.MODEL.MODEL_ID,
            ARTEFACT_IDS: args.ARTEFACTS.map(({ ARTEFACT_ID: id }) => id)
        }
        const updateArtefactStatus = await context.db
            .artefact
            .update(updateArtefactArgs)

        console.sys(updateArtefactStatus)
        // Insert new artefacts
        args.MODEL_ID = taskInfo.MODEL.MODEL_ID;
        args.TASK_ID = taskInfo.MODEL.TASK_ID;

        const addNewArtefactStatus = await context.db
            .artefact
            .add(args)

        console.sys(addNewArtefactStatus)

        const {modelStage: modelStage, modelStatus: modelStatus} = await acquireStageAndStatusFromCamunda(
            args.id,
            taskInfo.taskDefinitionKey,
            taskInfo.processDefinitionId,
            null,
            context
        );
        console.log(`Получен новый статус модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}: ${modelStatus}`)

        // Camunda close task
        const completeResult = await context.db
            .task
            .complete(args, context.user)
            .then(data => {
                context.log({
                    msg: `Завершение задачи ${taskInfo.TASK_NAME} для модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}`
                })

                if (modelStatus) {
                    context.db.card.changeStatus({ modelId: args.MODEL_ID, modelStatus })
                        .then()
                        .catch((err) => console.log(`Ошибка при смене статуса модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}: ${err}`))
                }

                if (modelStage) {
                    context.db.card.addStage({ modelId: args.MODEL_ID, modelStage })
                        .then()
                        .catch((err) => console.log(`Ошибка при смене этапа модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}: ${err}`))
                }

                return data
            })
            .catch(e => {
                context.log({
                    msg: `Завершение задачи ${taskInfo.TASK_NAME} для модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}`,
                    event: 'Ошибка'
                })
                throw e
            });

        // Успешное завершение – отправка аудита SUCCESS
        await auditClient.success(
            'SUMD_TASKCOMPLETE',
            correlationId,
            initiatorInfo,
            { taskId: args.id, modelId: taskInfo.MODEL.MODEL_ID, modelAlias: `model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}` }
        );

        return completeResult;
    } catch (error) {
        // Ошибка – отправка аудита FAILURE
        await auditClient.failure(
            'SUMD_TASKCOMPLETE',
            correlationId,
            error,
            initiatorInfo,
            { taskId: args.id, errorMessage: error.message }
        );
        throw error;
    }
};