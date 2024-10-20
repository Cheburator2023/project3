const ExpressRouter = require('express').Router;

const assignmentUpload = require('./assignmentUpload');
const upload = require('./upload');
const download = require('./download');
const report = require('./report');
const deleteModel = require('./deleteModel');
const deleteAssignment = require('./deleteAssignment');
const createNlpModel = require('./nlp/createNlpModel');
const changeStatus = require('./nlp/changeStatus');
const auth = require('../../middleware/auth')

const router = new ExpressRouter();

// Upload
router.post('/upload', upload.middleware, upload.resolver);
router.use('/download', download);
router.post('/assignmentUpload', assignmentUpload.middleware, assignmentUpload.resolver);

// Report
router.post('/report', report);

// Delete model
router.delete('/deleteModel', deleteModel);

// Delete assignment
router.delete('/deleteAssignment', deleteAssignment);

// NPL API
router.post('/v1/create-nlp-model', auth.authMiddleware, createNlpModel);
router.patch('/v1/change-status/:versionId', auth.authMiddleware, changeStatus);

module.exports = router;
