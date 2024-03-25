const fetch = require('isomorphic-fetch')

const teamcityHost = process.env.TEAMCITY_API

module.exports = ({ 
    path, 
    method = 'GET',
    body
}) => {
    console.sys('Teamcity POST:', `${teamcityHost}${path}`)
    const headers = {}
    headers['Content-Type'] = 'application/json'
    return fetch
    (
        `${teamcityHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
    .then(data => {
        console.sys('Teamcity', data.status)
        if (data.status === 200) return data.json()
        error.status = data.status
        error.system = 'Teamcity'
        throw error
    })
}