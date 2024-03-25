module.exports = (root, args, context) => {
    console.log('DELETE Rank')
    return context.db.risk_scale.deleteRank(args)
}