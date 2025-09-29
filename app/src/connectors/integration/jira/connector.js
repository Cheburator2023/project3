const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger')

const jiraHost = process.env.JIRA_API

module.exports = ({
                      path,
                      method = 'GET',
                      body,
                      file
                  }) => {
    tslgLogger.log(`JIRA request: ${method} ${jiraHost}${path}`, 'Запрос', 'info', null, {
        system: 'JIRA',
        path,
        method
    });

    const headers = {}
    if (!file)
        headers['Content-Type'] = 'application/json'

    return fetch(
        `${jiraHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
        .then(data => {
            tslgLogger.log(`JIRA response: ${data.status} ${data.statusText}`, 'Ответ', 'info', null, {
                system: 'JIRA',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'JIRA'

            tslgLogger.log(`JIRA error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'JIRA',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log(`JIRA unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'JIRA',
                path,
                method
            });
            throw error
        })
}