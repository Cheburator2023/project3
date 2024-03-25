const fetch = require('isomorphic-fetch')

const keycloakHost = process.env.KEYCLOAK_URL

module.exports = ({ 
    path, 
    token
}) => 
    fetch(
        `${keycloakHost}${path}`,
        {
            headers:  {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    )
    .then(data => {
        console.sys('Keycloak.', data.status, data.statusText)
        if (data.status === 200) return data.json()

        const error = new Error(data.statusText)
        error.status = data.status
        error.system = 'Keycloak'

        throw error
    })
    .catch(e => {
        console.sys(e)
        throw e
    })