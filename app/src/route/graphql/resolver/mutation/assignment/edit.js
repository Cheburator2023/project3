module.exports = async (root, args, context) => {
    const oldassignment = await context.db.assignment.updateAssignment(args)
    //await context.db.assignment.updateArtefacts(oldassignment.id)
    
    await context.db.assignment.updateModels(args)
    
    
    const newAssignment = await context.db.assignment.edit(args)

    const assignments = await context.db.assignment.assignments(args)
    let alias = `assignment${args.ROOT_ASSIGNMENT_ID}-v${assignments.length}`

    /* CREATE GIT REPO AND PROJECT */
    await context.integration.git.project(alias).catch(() => null)
    await context.integration.git.repo(alias).catch(() => null)
    
    await context.db.assignment.addArtefacts({
        ASSIGNMENT_ID: newAssignment.id,
        ...args
    })
    // Models
    await context.db.assignment.link(args)
    return newAssignment.id
}
