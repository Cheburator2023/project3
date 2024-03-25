module.exports = async (root, args, context) => {
    return context.db
        .user
        .removeUser(args)
        .then(d => {
            console.log(d)
            return true
        })
}