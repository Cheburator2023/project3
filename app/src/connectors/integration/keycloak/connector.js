const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const keycloakHost = process.env.KEYCLOAK_URL

module.exports = ({
                      path,
                      token
                  }) => {
    tslgLogger.log(`Keycloak request: GET ${keycloakHost}${path}`, 'Запрос', 'info', null, {
        system: 'Keycloak',
        path
    });

    return fetch(
        `${keycloakHost}${path}`,
        {
            headers:  {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    )
        .then(data => {
            tslgLogger.log(`Keycloak response: ${data.status} ${data.statusText}`, 'Ответ', 'info', null, {
                system: 'Keycloak',
                path,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'Keycloak'

            tslgLogger.log(`Keycloak error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'Keycloak',
                path,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log(`Keycloak unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'Keycloak',
                path
            });
            throw error
        })
}