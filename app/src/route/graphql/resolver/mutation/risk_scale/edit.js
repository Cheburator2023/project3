module.exports = (root, args, context) => {
    if (args.RISK_SCALE_NAME !== null) context.db.risk_scale.editName(args)
    if (args.RISK_SCALE_DESC !== null) context.db.risk_scale.editDesc(args)
    if (args.RISK_SCALE_STATUS !== null) context.db.risk_scale.editActiveFlg(args)
}
