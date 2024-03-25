module.exports = (root, args, context) => {
    if (context.user) return context.user
    throw new Error("401")
}