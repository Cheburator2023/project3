const multer  = require('multer')
const upload = multer()

const resolver = (req, res, next) =>{
    const { integration, db } = req.context
    const { name, rootAssignmentId, artefactId, action} = req.body
    const { buffer, originalname } = req.file
    const fileMeta = originalname.split('.')
    const format = fileMeta.length > 1 
        ? fileMeta[fileMeta.length - 1] 
        : 'txt'
    let assignments, file_link, alias  = null
    db.assignment.assignments({ROOT_ASSIGNMENT_ID: rootAssignmentId})
    .then(d=>{
        assignments = d 
        alias = `assignment${rootAssignmentId}-v${assignments.length}`
        return integration.git.upload(alias, `${name}.${format}`, buffer)
    })
    .then(res => {
        file_link = res.file_link
        if (action == "updateArtefact") {
            return db.assignment.editArtefact({
                ASSIGNMENT_ID: assignments.sort((a,b)=>new Date(b.CREATE_DATE)-new Date(a.CREATE_DATE))[0].ID,
                ARTEFACT_ID: artefactId,
                ARTEFACT_VALUE_ID: null,
                ARTEFACT_STRING_VALUE: file_link,
                ARTEFACT_ORIGINAL_VALUE: originalname
            })
        } else if (action == "addArtefact") return db.assignment.addArtefacts({
            ASSIGNMENT_ID: assignments.sort((a,b)=>new Date(b.CREATE_DATE)-new Date(a.CREATE_DATE))[0].ID,
            ARTEFACTS: [{
                ARTEFACT_ID: artefactId,
                ARTEFACT_STRING_VALUE: file_link,
                ARTEFACT_VALUE_ID: null,
                ARTEFACT_ORIGINAL_VALUE: originalname,
            }]
        })
    })  
    .then(d => {
            res.send(
                JSON.stringify({
                    ASSIGNMENT_ID: assignments.sort((a,b)=>new Date(b.CREATE_DATE)-new Date(a.CREATE_DATE))[0].ID,
                    upload: true,
                    path: file_link,
                })
            )
        })
        .catch(e =>{
            console.log(e) 
            return next(e)
        })
}

module.exports = {
    middleware: upload.single('file'),
    resolver
}



