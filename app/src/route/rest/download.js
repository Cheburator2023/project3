module.exports = async (req, res) => {
    try {
        console.log(req.query)
        const fileBody = await req.context.integration.git.download(req.query)
        fileBody.pipe(res)
    } catch(e) {
        res.status(500).end()
    }
}