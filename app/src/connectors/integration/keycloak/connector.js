const {tracedFetch} = require("../../../utils/httpClient");
const tslgLogger = require('../../../utils/logger');

const keycloakHost = process.env.KEYCLOAK_URL

module.exports = ({
                      path,
                      token
                  }) => {
    tslgLogger.log('info', `Keycloak request: GET ${keycloakHost}${path}`, 'Запрос', null, {
        system: 'Keycloak',
        path
    });

    // Используем tracedFetch вместо fetch
    return tracedFetch(
        `${keycloakHost}${path}`,
        {
            headers:  {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    )
        .then(data => {
            tslgLogger.log('info', `Keycloak response: ${data.status} ${data.statusText}`, 'Ответ', null, {
                system: 'Keycloak',
                path,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'Keycloak'

            tslgLogger.log('error', `Keycloak error: ${data.statusText}`, 'Ошибка', error, {
                system: 'Keycloak',
                path,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log('error', `Keycloak unexpected error: ${error.message}`, 'Ошибка', error, {
                system: 'Keycloak',
                path
            });
            throw error
        })
}