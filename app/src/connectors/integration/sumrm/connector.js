const fetch = require('isomorphic-fetch')

const sumrmHost = process.env.SUMRM_API

module.exports = ({ 
    path, 
    method = 'GET',
    body,
    token
}) => {
    const fullUrl = `${sumrmHost}${path}`
    
    console.sys('SUMRM', `[DEBUG] Making HTTP request to: ${fullUrl}`)
    console.sys('SUMRM', `[DEBUG] Method: ${method}`)
    console.sys('SUMRM', `[DEBUG] Token provided: ${!!token}`)
    
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
    
    console.sys('SUMRM', `[DEBUG] Request headers:`, headers)
    
    return fetch
    (
        fullUrl,
        requestConfig
    )
    .then(async data => {
        console.sys('SUMRM', `[DEBUG] HTTP response status: ${data.status}`)
        console.sys('SUMRM', `[DEBUG] HTTP response headers:`, Object.fromEntries(data.headers.entries()))
        
        let responseBody = null
        try {
            const responseText = await data.text()
            console.sys('SUMRM', `[DEBUG] Raw response text:`, responseText)
            try {
                responseBody = JSON.parse(responseText)
            } catch (parseError) {
                responseBody = responseText
            }
        } catch (bodyError) {
            // Ignore body parsing errors
        }

        if (data.status === 200) {
            console.sys('SUMRM', `[DEBUG] Success response:`, JSON.stringify(responseBody, null, 2))
            return responseBody
        }
        if (data.status === 404) {
            console.sys('SUMRM', `[DEBUG] 404 Not Found - returning null`)
            return null // Handle not found case gracefully
        }

        console.sys('SUMRM', `[DEBUG] Error response:`, JSON.stringify(responseBody, null, 2))
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
