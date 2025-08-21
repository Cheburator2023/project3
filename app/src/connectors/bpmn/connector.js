const fetch = require('isomorphic-fetch')

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

    if (context?.log) {
        context.log({
            msg: `Run ${method} ${path}`,
            event: 'Запрос',
            level: 'info',
            risCode: '0000'
        });
    }

    const parmas = {
        method: method,
        headers,
        body
    }
    const url = `${host}${path}`

    return fetch(url, parmas)
        .then(data => {
            const { status, statusText } = data

            if ((status === 200 || status === 204) && context?.log) {
                context.log({
                    msg: `BPMN ${method} ${path} completed successfully`,
                    event: 'Успешно',
                    level: 'info',
                    risCode: '0000'
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

            if (context?.log) {
                context.log({
                    msg: `BPMN error: ${msg}`,
                    event: 'Ошибка',
                    level: 'error',
                    risCode: status.toString(),
                    error: error
                });
            }

            throw error
        })
        .then(data => {
            if (context?.log) {
                context.log({
                    msg: `Method ${path} completed successfully`,
                    event: 'Успешно',
                    level: 'info',
                    risCode: '0000'
                });
            }
            return data
        })
        .catch(e => {
            if (context?.log) {
                context.log({
                    msg: `Unexpected BPMN error: ${e.message}`,
                    event: 'Ошибка',
                    level: 'error',
                    risCode: '500',
                    error: e
                });
            }
            throw e
        })
}

module.exports = connector