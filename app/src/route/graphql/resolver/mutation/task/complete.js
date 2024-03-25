module.exports = async (root, args, context) => {
    // Get Task Info
    const taskInfo = await context.db
        .task
        .one(args, context.user)
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
    // Camunda close task
    return context.db
        .task
        .complete(args, context.user)
        .then(data => {
            context.log({
                msg: `Завершение задачи ${taskInfo.TASK_NAME} для модели model${taskInfo.MODEL.ROOT_MODEL_ID}-v${taskInfo.MODEL.MODEL_VERSION}`
            })
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
