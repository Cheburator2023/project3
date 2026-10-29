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

    tslgLogger.info(`Run ${method} ${path}`, 'Запрос', {
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
        .then(response => {
            const { status, statusText } = response;

            if (status === 200 || status === 204) {
                tslgLogger.info(`BPMN ${method} ${path} completed successfully`, 'Успешно', {
                    requestId,
                    system: 'BPMN',
                    status
                });
            }

            // Успешные ответы
            if (status === 204) return true;
            if (status === 200) return response.json();

            // Обработка ошибок: читаем тело ответа
            return response.json()
                .catch(jsonParseError => {
                    // Если не удалось распарсить JSON — используем statusText
                    const msg = `Method ${path}. Failed: ${statusText} (JSON parse error: ${jsonParseError.message})`
                    const error = new Error(msg)
                    error.status = status
                    error.system = 'BPMN'

                    tslgLogger.error(
                        `BPMN ${method} ${path} failed: ${msg}`,
                        'Ошибка',
                        error,
                        {
                            requestId,
                            system: 'BPMN',
                            status,
                        }
                    );

                    throw error
                })
                .then(errorBody => {
                    const errorMessage = errorBody?.message || statusText;
                    const errorType = errorBody?.type || 'UnknownException';
                    const error = new Error(errorMessage)
                    error.status = status
                    error.system = 'BPMN'
                    error.type = errorType

                    tslgLogger.error(
                        `BPMN ${method} ${path} failed with error: ${errorMessage}`,
                        'Ошибка',
                        error,
                        {
                            requestId,
                            system: 'BPMN',
                            status,
                            errorType
                        }
                    );

                    throw error
                })
        })
        .then(data => {
            tslgLogger.info(`Method ${path} completed successfully`, 'Успешно', {
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
                    status: e.status
                });
            }
            if (process.env.NODE_ENV !== 'production') {
                tslgLogger.debug(`Unexpected BPMN error: ${e.message}`, 'ОтладкаBPMN', {
                    requestId,
                    system: 'BPMN',
                    error: e.message,
                    status: e.status,
                    errorType: e.type
                });
            }
            throw e
        })
}

module.exports = connector
