const fetch = require('isomorphic-fetch');
const { getOutgoingTraceHeaders } = require('./tracingContext');
const tslgLogger = require('./logger');
const HTTP_CLIENT = 'HttpClient';

/**
 * Выполняет HTTP-запрос с автоматическим добавлением заголовков трассировки.
 * Поддерживает те же параметры, что и fetch, с дополнительной опцией skipTraceHeaders
 * для случаев, когда заголовки не нужно добавлять.
 * @param {string} url - URL запроса
 * @param {object} options - параметры fetch (метод, заголовки, тело и т.д.)
 * @param {boolean} skipTraceHeaders - если true, не добавляет трассировочные заголовки
 * @returns {Promise<Response>}
 */
async function tracedFetch(url, options = {}, skipTraceHeaders = false) {
    const traceHeaders = skipTraceHeaders ? {} : getOutgoingTraceHeaders();

    // Объединяем заголовки: сначала переданные, затем трассировочные (переданные имеют приоритет)
    const headers = {
        ...options.headers,
        ...traceHeaders,
    };

    const finalOptions = {
        ...options,
        headers,
    };

    tslgLogger.info(`TracedFetch: ${options.method || 'GET'} ${url}`, HTTP_CLIENT, {
        traceHeaders,
        skipTraceHeaders,
    })

    // Логируем запрос для отладки (можно убрать в production)
    if (process.env.NODE_ENV !== 'production') {
        tslgLogger.info(`Full headers: ${JSON.stringify(headers)}`, HTTP_CLIENT,);
    }

    return fetch(url, finalOptions);
}

module.exports = {
    tracedFetch,
};