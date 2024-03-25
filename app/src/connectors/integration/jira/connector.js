const fetch = require('isomorphic-fetch')

const jiraHost = process.env.JIRA_API

module.exports = ({ 
    path, 
    method = 'GET',
    body,
    file
}) => {
    console.sys('JIRA', `${jiraHost}${path}`)
    const headers = {}
    if (!file)
        headers['Content-Type'] = 'application/json'
    return fetch
    (
        `${jiraHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
    .then(data => {
        console.sys('JIRA', data.status, data.statusText)
        if (data.status === 200) return data.json()

        const error = new Error(data.statusText)
        error.status = data.status
        error.system = 'JIRA'

        throw error
    })
}