const fetch = require('isomorphic-fetch')

const sumrmHost = process.env.SUMRM_API

module.exports = ({ 
    path, 
    method = 'GET',
    body,
    token
}) => {
    const fullUrl = `${sumrmHost}${path}`
    
    const headers = {}
    headers['Content-Type'] = 'application/json'
    
    // Add authorization header if token is provided
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    
    const requestConfig = {
        method: body ? 'POST' : method,
        headers,
        body
    }
    
    return fetch
    (
        fullUrl,
        requestConfig
    )
    .then(async data => {
        let responseBody = null
        try {
            const responseText = await data.text()
            try {
                responseBody = JSON.parse(responseText)
            } catch (parseError) {
                responseBody = responseText
            }
        } catch (bodyError) {
            // Ignore body parsing errors
        }

        if (data.status === 200) {
            return responseBody
        }
        if (data.status === 404) {
            return null // Handle not found case gracefully
        }

        const error = new Error(data.statusText)
        error.status = data.status
        error.system = 'SUMRM'
        error.responseBody = responseBody
        throw error
    })
    .catch(e => {
        console.sys('SUMRM', `[ERROR]`, e.message)
        throw e
    })
}
