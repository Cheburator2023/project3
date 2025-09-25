const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const teamcityHost = process.env.TEAMCITY_API

module.exports = ({
                      path,
                      method = 'GET',
                      body
                  }) => {
    tslgLogger.log(`Teamcity request: ${method} ${teamcityHost}${path}`, 'Запрос', 'info', null, {
        system: 'Teamcity',
        path,
        method
    });

    const headers = {}
    headers['Content-Type'] = 'application/json'

    return fetch(
        `${teamcityHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
        .then(data => {
            tslgLogger.log(`Teamcity response: ${data.status}`, 'Ответ', 'info', null, {
                system: 'Teamcity',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'Teamcity'

            tslgLogger.log(`Teamcity error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'Teamcity',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log(`Teamcity unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'Teamcity',
                path,
                method
            });
            throw error
        })
}