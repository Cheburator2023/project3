module.exports = (root, args, context) => {
    if (!args.data.ARTEFACT_ID) return true
    return context.db.risk_scale.addArtefacts({
        ROOT_RISK_SCALE_ID: args.ROOT_RISK_SCALE_ID,
        ARTEFACTS: [args.data]
    })
}
