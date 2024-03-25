module.exports = async (root, args, context) => {
    await context.db.assignment.editArtefact(args)
}
