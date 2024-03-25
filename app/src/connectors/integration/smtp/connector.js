const fetch = require('isomorphic-fetch')

const smtpHost = process.env.SMTP_HOST || 'http://nodered.apps.pim.angara.cloud/'

module.exports = ({ 
    path, 
    method = 'GET',
    body
}) => {
    console.sys('EMAIL', `${smtpHost}${path}`)
    return fetch
    (
        `${smtpHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers: {
                'Content-Type': 'application/json'
            },
            body
        }
    )
    .then(data => {
        console.sys('SMTP', data.status, data.statusText)

        if (data.status === 200) return data.json()

        const error = new Error(data.statusText)
        error.status = data.status
        error.system = 'Keycloak'

        throw error
    })
    .catch(e => {
        console.log(e)
        throw e
    })
}