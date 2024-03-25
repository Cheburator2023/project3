module.exports = (root, args, context) => {
    // console.log(args.artefact)
    return context.db
        .artefact
        .editArtefact(args.artefact)
        .then(d => d.rowsAffected > 0)
}