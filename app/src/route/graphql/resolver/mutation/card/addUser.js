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

    return context.db.user
        .addUser(args, context.user)
        .then(d => {
            console.log(d)
            return true
        })
}