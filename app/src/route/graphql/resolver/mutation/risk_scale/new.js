module.exports = async (root, args, context) => {
    const newRiskScale = await context.db.risk_scale.new(args)

    // Rist artefacts
    await context.db.risk_scale.addArtefacts({
        ROOT_RISK_SCALE_ID: newRiskScale.id,
        ...args
    })

    // Rangs
    await context.db.risk_scale.addRank({
        ROOT_RISK_SCALE_ID: newRiskScale.id,
        ...args
    })
    
    // Models
    await context.db.risk_scale.link({
        ROOT_RISK_SCALE_ID: newRiskScale.id,
        ...args
    })

    return newRiskScale.id
}
