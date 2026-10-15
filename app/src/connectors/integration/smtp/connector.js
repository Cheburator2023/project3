const {tracedFetch} = require("../../../utils/httpClient");
const tslgLogger = require('../../../utils/logger');

const smtpHost = process.env.SMTP_HOST || 'http://nodered.apps.pim.angara.cloud/'

module.exports = ({
                      path,
                      method = 'GET',
                      body
                  }) => {
    tslgLogger.log('info', `Email request: ${method} ${smtpHost}${path}`, 'Запрос', null, {
        system: 'SMTP',
        path,
        method
    });

    // Используем tracedFetch вместо fetch
    return tracedFetch(
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
            tslgLogger.log('info', `SMTP response: ${data.status} ${data.statusText}`, 'Ответ', null, {
                system: 'SMTP',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'SMTP'

            tslgLogger.log('error', `SMTP error: ${data.statusText}`, 'Ошибка', error, {
                system: 'SMTP',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log('error', `SMTP unexpected error: ${error.message}`, 'Ошибка', error, {
                system: 'SMTP',
                path,
                method
            });
            throw error
        })
}