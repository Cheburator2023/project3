const getUserName = require("../card/helpers");

module.exports = async (root, args, context) => {
    // Get Task Info
    const taskInfo = await context.db
        .task
        .one(args, context.user)

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

    const modelStatus = await context.bpmn.getTaskVar(args.id, 'model_status');
    const modelStage = await context.bpmn.getTaskVar(args.id, 'model_stage');

    console.log(`Получен новый статус модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}: ${modelStatus}`)

    // Camunda close task
    return context.db
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
        })
}
