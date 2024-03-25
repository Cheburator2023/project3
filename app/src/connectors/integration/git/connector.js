const fetch = require('isomorphic-fetch')

const gitHost = process.env.GIT_API

module.exports = ({ 
    path, 
    method = 'GET',
    body,
    file
}) => {
    console.sys('GIT', `${gitHost}${path}`)

    const headers = {}
    if (!file)
        headers['Content-Type'] = 'application/json'
    return fetch
    (
        `${gitHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
    .then(data => {
        console.sys('GIT', data.status, data.statusText)
        if (data.status === 200) return data.json()

        const error = new Error(data.statusText)
        error.status = data.status
        error.system = 'GIT'

        throw error
    })
}