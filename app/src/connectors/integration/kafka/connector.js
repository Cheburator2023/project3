const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const kafkaHost = process.env.KAFKA_API

module.exports = ({
                      path,
                      method = 'GET',
                      body
                  }) => {
    tslgLogger.log(`Kafka request: ${method} ${kafkaHost}${path}`, 'Запрос', 'info', null, {
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
            tslgLogger.log(`Kafka response: ${data.status}`, 'Ответ', 'info', null, {
                system: 'Kafka',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'Kafka'

            tslgLogger.log(`Kafka error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'Kafka',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log(`Kafka unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'Kafka',
                path,
                method
            });
            throw error
        })
}