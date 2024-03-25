const availableGroups = ['ds', 'ds_lead', 'mipm']
const cancelInstanceKey = 'cancel'

module.exports = async (root, args, context) => {
    const model = args.MODEL_ID
    /* Check role model. Only ds, ds_lead, mipm */
    const { groups } = context.user
    const checkRoleModel = availableGroups.filter(g => groups.includes(g)).length > 0
    if (!checkRoleModel) return null

    /* Check if already exist */
    const checkCancelInstance = await context.db.instance.check({ model, key: cancelInstanceKey })
    if (checkCancelInstance.length > 0) {
        return checkCancelInstance[0].BPMN_INSTANCE_ID;
    }

    /* Create cancel model instance */
    let cancel_role = null
    if (groups.includes('ds')) cancel_role = 'ds'
    if (groups.includes('ds_lead')) cancel_role = 'ds_lead'
    if (groups.includes('mipm')) cancel_role = 'mipm'

    const instance = await context.bpmn
        .start(
            cancelInstanceKey,
            JSON.stringify({
                variables: {
                    model: { value: model },
                    cancel_role: { value: cancel_role }
                }
            })
        )
        .then(d => d.id)

    await context.db.instance.new({ model, instance, key: cancelInstanceKey })

    return instance;
}