module.exports = (root, args, context) => {
    console.log('EDIT Rank')
    console.log(args)
    return context.db.risk_scale.editRank(args)
}