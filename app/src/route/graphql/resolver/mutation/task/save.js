module.exports = async (root, args, context) => {
    // Get Task Info
    const taskInfo = await context.db
        .task
        .one(args, context.user)
    // Close artefact_realization version
    const updateArtefactArgs = {
        MODEL_ID: taskInfo.MODEL.MODEL_ID,
        ARTEFACT_IDS: args.ARTEFACTS
            .map(a => a.ARTEFACT_ID)
    }
    const updateArtefactStatus = await context.db
        .artefact
        .update(updateArtefactArgs)

    console.sys(updateArtefactStatus)
    // Insert new artefacts
    args.MODEL_ID = taskInfo.MODEL.MODEL_ID
    const addNewArtefactStatus = await context.db
        .artefact
        .add(args)

    console.sys(addNewArtefactStatus)
   
    return true
}
