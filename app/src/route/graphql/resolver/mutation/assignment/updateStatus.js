module.exports = async (root, args, context) => {
    await context.db.assignment.updateStatus(args)
    return args.STATUS
}
