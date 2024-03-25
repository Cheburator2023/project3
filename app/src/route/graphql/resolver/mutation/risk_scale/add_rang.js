module.exports = (root, args, context) => {
    console.log('ADD Rank')
    if (!args.data.SCALE_RANK_ID) return true
    return context.db.risk_scale.addRank({
        ROOT_RISK_SCALE_ID: args.ROOT_RISK_SCALE_ID,
        RISK_SCALE_RANKS: [args.data]
    })
}