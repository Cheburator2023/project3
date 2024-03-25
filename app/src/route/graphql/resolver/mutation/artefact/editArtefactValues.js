module.exports = (root, args, context) => {
    // console.log(args.values)
    return context.db
        .artefact
        .editArtefactValue(args.values)
        .then(d => d.rowsAffected > 0)
}