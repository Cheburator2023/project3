module.exports = async (root, args, context) => {
    // console.log(args)
    const modelUsers = await context.db
        .user
        .card(args.MODEL_ID)

    const username = args.user.username
    const group = args.user.group

    if (
        modelUsers
            .filter(u => u.role === group)
            .filter(u => u.username === username)
            .length > 0
    )
        return true

    // PRJ-COMMON-26, 45.3: «Бизнес-партнер стрима» (mipm_stream) НЕ может добавлять
    // пользователей ни в одну группу на вкладке «Ответственные»
    const assignerGroups = context.user && context.user.groups;
    if (Array.isArray(assignerGroups) && assignerGroups.includes('mipm_stream')) {
        return false;
    }

    return context.db.user
        .addUser(args, context.user)
        .then(d => {
            console.log(d)
            return true
        })
}