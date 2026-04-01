const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const kafkaHost = process.env.KAFKA_API

function consoleDebug(...args) {
    const consoleToUse = console.original?.log || console.log;
    consoleToUse('[DEBUG}', ...args);
}

module.exports = ({
                      path,
                      method = 'GET',
                      body
                  }) => {
    tslgLogger.log('info', `Kafka request: ${method} ${kafkaHost}${path}`, 'Запрос Kafka response', null, {
        system: 'Kafka',
        path,
        method
    });

    const headers = {}
    headers['Content-Type'] = 'application/json'

    return fetch(
        `${kafkaHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
        .then(data => {
            tslgLogger.log('info', `Kafka response: ${data.status}`, 'Ответ Kafka response', null, {
                system: 'Kafka',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'Kafka'

            if (process.env.NODE_ENV !== 'production') {
                consoleDebug(`Kafka error: ${data.statusText} - ${error.message}`, {
                    system: 'Kafka',
                    path,
                    method,
                    status: data.status,
                    error: error.message
                });
            }

            throw error
        })
        .catch(error => {
            if (process.env.NODE_ENV !== 'production') {
                consoleDebug(`Kafka unexpected error: ${error.message}`, {
                    system: 'Kafka',
                    path,
                    method,
                    error: error.message
                });
            }
            throw error
        })
}