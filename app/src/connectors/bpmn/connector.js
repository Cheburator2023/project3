const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../utils/logger')

const host = process.env.BPMN_API || 'http://104.208.164.58:8888/engine-rest'
const user = process.env.BPMN_USER || 'demo'
const pwd = process.env.BPMN_PWD || 'demo'

const Authorization =
    `Basic ${Buffer.from(`${user}:${pwd}`).toString('base64')}`


const headers = {
    'Content-Type': 'application/json',
    Authorization
}

const connector = ({ path, method = 'GET', body }, context = {}) => {

    const requestId = context?.requestId || 'unknown';

    tslgLogger.log(`Run ${method} ${path}`, 'Запрос', 'info', null, {
        requestId,
        system: 'BPMN'
    });

    const params = {
        method: method,
        headers,
        body
    }
    const url = `${host}${path}`

    return fetch(url, params)
        .then(data => {
            const { status, statusText } = data

            if (status === 200 || status === 204) {
                tslgLogger.log(`BPMN ${method} ${path} completed successfully`, 'Успешно', 'info', null, {
                    requestId,
                    system: 'BPMN',
                    status
                });
            }

            // Success
            if (status === 204) return true
            if (status === 200) return data.json()

            // Error handler
            const msg = `Method ${path}. Failed: ${statusText}`
            const error = new Error (msg)
            error.status = status
            error.system = 'BPMN'

            tslgLogger.log(`BPMN error: ${msg}`, 'Ошибка', 'error', error, {
                requestId,
                system: 'BPMN',
                status
            });

            throw error
        })
        .then(data => {
            tslgLogger.log(`Method ${path} completed successfully`, 'Успешно', 'info', null, {
                requestId,
                system: 'BPMN'
            });
            return data
        })
        .catch(e => {
            tslgLogger.log(`Unexpected BPMN error: ${e.message}`, 'Ошибка', 'error', e, {
                requestId,
                system: 'BPMN'
            });
            throw e
        })
}

module.exports = connector