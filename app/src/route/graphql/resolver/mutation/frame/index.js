module.exports = {
    addFrame: (root, args, context) => 
        context.db.frame.add(args)
}