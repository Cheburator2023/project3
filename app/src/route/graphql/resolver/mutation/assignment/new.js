module.exports = async (root, args, context) => {
    const newRoot = await context.db.assignment.newRoot(args)
    
    const newAssignment = await context.db.assignment.new({
            ROOT_ASSIGNMENT_ID: newRoot.id,
            ...args
        }
    )
    let alias = `assignment${newRoot.id}-v1`
    /* CREATE GIT REPO AND PROJECT */
    await context.integration.git.project(alias).catch(() => null)
    await context.integration.git.repo(alias).catch(() => null)
    await context.db.assignment.addArtefacts({
        ASSIGNMENT_ID: newAssignment.id,
        ...args
    })
    // Models
    await context.db.assignment.link({
        ROOT_ASSIGNMENT_ID: newRoot.id,
        ...args
    })
    return newRoot.id
}
