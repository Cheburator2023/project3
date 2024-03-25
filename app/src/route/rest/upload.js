const multer  = require('multer')
const upload = multer()

const resolver = (req, res, next) => {
    const { integration, db } = req.context
    const { name, model, key } = req.body
    const { buffer, originalname } = req.file
    const fileMeta = originalname.split('.')
    const format = fileMeta.length > 1 
        ? fileMeta[fileMeta.length - 1] 
        : 'txt'

    console.log(name, model, key)//, buffer)

    integration.git
        .upload(model, `${name}.${format}`, buffer)
        .then(result => {
            const { file_link } = result
            res.send(
                JSON.stringify({
                    upload: true,
                    name,
                    path: file_link,
                    key
                })
            )
        })
        .catch(e => next(e))
}

module.exports = {
    middleware: upload.single('file'),
    resolver
}



