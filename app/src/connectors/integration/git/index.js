const connector = require('./connector')
const fetch = require('isomorphic-fetch')
const storage = process.env.GIT_STORAGE;

class Git {

    // Uploda file
    upload = (model, name, data) => 
        connector({
            path: `${storage}/${model}/${model}/upload_file/${name}`,
            method: 'POST',
            body: data,
            file: true
        })
    // Get link for upload
    download = ({ model, name }) => fetch(`${process.env.GIT_API}${storage}/${model}/${model}/${name}`)
        .then(res => res.body)

    //Get filelink for download
    getFileLink = ({ model, name }) => 
        connector({
            path: `${storage}/${model}/${model}/${name}/get-file-link`,
        })

    // Create git project
    project = (key, desc = 'СУМ') => 
        connector({
            path: `${storage}/projects/create`,
            body: JSON.stringify({ key, name: key, description: `${desc} ${key}`})
        })

    // Create repo project
    repo = key => 
        connector({
            path: `${storage}/${key}/repos/create`,
            body: JSON.stringify({ name: key, scmId: 'git', forkable: true })
        })
    // Copy repo to new repo
    copy = (parent, current) => 
        connector({
            path: `${storage}/${parent}/${parent}/copy_to/${current}/${current}`
        })
}

module.exports = Git