const { tracedFetch } = require('../../utils/httpClient')
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

    tslgLogger.log('info',`Run ${method} ${path}`, 'Запрос', null, {
        requestId,
        system: 'BPMN'
    });

    const params = {
        method: method,
        headers,
        body
    }
    const url = `${host}${path}`

    // Используем tracedFetch вместо fetch
    return tracedFetch(url, params)
        .then(async data => {
            const { status, statusText } = data;

            if (status === 200 || status === 204) {
                tslgLogger.log('info',`BPMN ${method} ${path} completed successfully`, 'Успешно', null, {
                    requestId,
                    system: 'BPMN',
                    status
                });
            }

            // Успешные ответы
            if (status === 204) return true;
            if (status === 200) return data.json();

            // Обработка ошибок
            const errorBody = await data.json().catch(() => null);
            const msg = errorBody?.message || `Method ${path}. Failed: ${statusText}`
            const error = new Error (msg)
            error.status = status
            error.system = 'BPMN'
            error.type = errorBody?.type || 'UnknownException'

            if (process.env.NODE_ENV !== 'production') {
                tslgLogger.debug(`BPMN error: ${msg}`, 'Отладка', {
                    requestId,
                    system: error.system,
                    status,
                    errorType: error.type,
                    error: error.message
                });
            }

            throw error
        })
        .then(data => {
            tslgLogger.log('info', `Method ${path} completed successfully`, 'Успешно', null, {
                requestId,
                system: 'BPMN'
            });
            return data
        })
        .catch(e => {
            if (e.system !== 'BPMN') {
                tslgLogger.error(`BPMN ${method} ${path} request failed: ${e.message}`, 'Ошибка', e, {
                    requestId,
                    system: 'BPMN',
                    status: e.status,
                    errorType: e.type
                });
            }
            if (process.env.NODE_ENV !== 'production') {
                tslgLogger.debug(`Unexpected BPMN error: ${e.message}`, 'ОтладкаBPMN', {
                    requestId,
                    system: 'BPMN',
                    error: e.message,
                    status: e.status,
                    errorType: e.type,
                    stack: e.stack
                });
            }
            throw e
        })
}

module.exports = connector
