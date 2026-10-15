const {tracedFetch} = require("../../../utils/httpClient");
const tslgLogger = require('../../../utils/logger');

const sumrmHost = process.env.SUMRM_API

module.exports = ({
                      path,
                      method = 'GET',
                      body,
                      token
                  }) => {
    const fullUrl = `${sumrmHost}${path}`

    tslgLogger.log('info', `SUMRM request: ${method} ${fullUrl}`, 'Запрос', null, {
        system: 'SUMRM',
        path,
        method
    });

    const headers = {}
    headers['Content-Type'] = 'application/json'

    // Add authorization header if token is provided
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const requestConfig = {
        method: body ? 'POST' : method,
        headers,
        body
    }

    // Используем tracedFetch вместо fetch
    return tracedFetch
    (
        fullUrl,
        requestConfig
    )
    .then(async data => {
        let responseBody = null
        try {
            const responseText = await data.text()
            try {
                responseBody = JSON.parse(responseText)
            } catch (parseError) {
                responseBody = responseText
            }
        } catch (bodyError) {
            // Ignore body parsing errors
        }

            tslgLogger.log('info', `SUMRM response: ${data.status} ${data.statusText}`, 'Ответ', null, {
                system: 'SUMRM',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) {
                return responseBody
            }
            if (data.status === 404) {
                return null
            }

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'SUMRM'
            error.responseBody = responseBody

            tslgLogger.log('error', `SUMRM error: ${data.statusText}`, 'Ошибка', error, {
                system: 'SUMRM',
                path,
                method,
                status: data.status
            });

            throw error
        })
        .catch(error => {
            tslgLogger.log('error', `SUMRM unexpected error: ${error.message}`, 'Ошибка', error, {
                system: 'SUMRM',
                path,
                method
            });
            throw error
        })
}
