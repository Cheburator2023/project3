module.exports = async (root, args, context) => {
    console.log(args)
    await context.db.model_risk.new(args)
    return true
}
