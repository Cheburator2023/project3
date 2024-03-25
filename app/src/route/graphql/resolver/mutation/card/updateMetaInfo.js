module.exports = async (root, args, context) => {
    if (args.MODEL_NAME) context.db.card.editName(args)
    if (args.MODEL_DESC) context.db.card.editDesc(args)
}
