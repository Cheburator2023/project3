const {tracedFetch} = require("../../../utils/httpClient");
const tslgLogger = require('../../../utils/logger');

const teamcityHost = process.env.TEAMCITY_API

module.exports = ({
                      path,
                      method = 'GET',
                      body
                  }) => {
    tslgLogger.log('info', `Teamcity request: ${method} ${teamcityHost}${path}`, 'Запрос', null, {
        system: 'Teamcity',
        path,
        method
    });

    const headers = {}
    headers['Content-Type'] = 'application/json'

    // Используем tracedFetch вместо fetch
    return tracedFetch(
        `${teamcityHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
        .then(data => {
            tslgLogger.log('info', `Teamcity response: ${data.status}`, 'Ответ', null, {
                system: 'Teamcity',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'Teamcity'

            tslgLogger.log('error', `Teamcity error: ${data.statusText}`, 'Ошибка', error, {
                system: 'Teamcity',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log('error', `Teamcity unexpected error: ${error.message}`, 'Ошибка', error, {
                system: 'Teamcity',
                path,
                method
            });
            throw error
        })
}