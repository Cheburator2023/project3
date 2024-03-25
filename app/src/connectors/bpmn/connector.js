const fetch = require('isomorphic-fetch')

const host = process.env.BPMN_API || 'http://104.208.164.58:8888/engine-rest' 
const user = process.env.BPMN_USER || 'demo'
const pwd = process.env.BPMN_PWD || 'demo'

const Authorization = 
    `Basic ${Buffer.from(`${user}:${pwd}`).toString('base64')}`
    

const headers = {
    'Content-Type': 'application/json',
    Authorization
}

const connector = ({ path, method = 'GET', body }) => {
    
    console.sys('Bpmn.', `Run ${method} ${path}`)

    const parmas = {
        method: method,
        headers,
        body
    }
    const url = `${host}${path}`


    return fetch(url, parmas)
        .then(data => {
            const { status, statusText } = data
            console.log(status, statusText)
            // Success
            if (status === 204) return true
            if (status === 200) return data.json()

            // Error handler
            const msg = `Method ${path}. Failed: ${statusText}` 
            const error = new Error (msg)
            error.status = status
            error.system = 'BPMN'
            throw error
        })
        .then(data => {
            console.sys(
                'Bpmn.',
                `Method ${path}.`,
                'Success.'
            )
            return data
        })
        .catch(e => {
            throw e
        })
}

module.exports = connector
