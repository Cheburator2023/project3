const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const gitHost = process.env.GIT_API

module.exports = ({
                      path,
                      method = 'GET',
                      body,
                      file
                  }, context = {}) => {

    tslgLogger.log(`GIT request: ${method} ${gitHost}${path}`, 'Запрос', 'info', null, {
        system: 'GIT',
        path,
        method
    });

    const headers = {}
    if (!file)
        headers['Content-Type'] = 'application/json'

    return fetch(
        `${gitHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
        .then(data => {
            if (data.status === 200) {
                tslgLogger.log(`GIT response: ${data.status} ${data.statusText}`, 'Ответ', 'info', null, {
                    system: 'GIT',
                    path,
                    method,
                    status: data.status
                });
                return data.json()
            }

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'GIT'

            tslgLogger.log(`GIT error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'GIT',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log(`GIT unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'GIT',
                path,
                method
            });
            throw error
        })
}