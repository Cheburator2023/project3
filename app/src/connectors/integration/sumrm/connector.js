const fetch = require('isomorphic-fetch')

const sumrmHost = process.env.SUMRM_API

module.exports = ({ 
    path, 
    method = 'GET',
    body
}) => {
    console.sys('SUMRM', `${sumrmHost}${path}`)
    
    const headers = {}
    headers['Content-Type'] = 'application/json'
    return fetch
    (
        `${sumrmHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
    .then(data => {
        console.sys('SUMRM', data.status, data.statusText)

        if (data.status === 200) return data.json()
        if (data.status === 404) return null // Handle not found case gracefully

        const error = new Error(data.statusText)
        error.status = data.status
        error.system = 'SUMRM'
        throw error
    })
    .catch(e => {
        console.log(e)
        throw e
    })
}
