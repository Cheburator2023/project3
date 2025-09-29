const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const smtpHost = process.env.SMTP_HOST || 'http://nodered.apps.pim.angara.cloud/'

module.exports = ({
                      path,
                      method = 'GET',
                      body
                  }) => {
    tslgLogger.log(`Email request: ${method} ${smtpHost}${path}`, 'Запрос', 'info', null, {
        system: 'SMTP',
        path,
        method
    });

    return fetch(
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
            tslgLogger.log(`SMTP response: ${data.status} ${data.statusText}`, 'Ответ', 'info', null, {
                system: 'SMTP',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'SMTP'

            tslgLogger.log(`SMTP error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'SMTP',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log(`SMTP unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'SMTP',
                path,
                method
            });
            throw error
        })
}