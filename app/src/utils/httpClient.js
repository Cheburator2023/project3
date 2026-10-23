const fetch = require('isomorphic-fetch');
const { getOutgoingTraceHeaders } = require('./tracingContext');
const tslgLogger = require('./logger');
const HTTP_CLIENT = 'HttpClient';

/**
 * Выполняет HTTP-запрос с автоматическим добавлением заголовков трассировки
 * и гарантированным таймаутом.
 * Поддерживает те же параметры, что и fetch, с дополнительной опцией skipTraceHeaders
 * для случаев, когда заголовки не нужно добавлять.
 *
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

    // Устанавливаем таймаут. Приоритет:
    // 1. Переданный в options.timeout
    // 2. Переменная окружения HTTP_CLIENT_TIMEOUT_MS
    // 3. Дефолтное значение 30000 мс (30 секунд)
    const timeoutMs = options.timeout || parseInt(process.env.HTTP_CLIENT_TIMEOUT_MS, 10) || 30000;

    const finalOptions = {
        ...options,
        headers,
        timeout: timeoutMs, // Нативная поддержка таймаута в isomorphic-fetch/node-fetch
    };

    tslgLogger.debug(`TracedFetch: ${options.method || 'GET'} ${url}`, HTTP_CLIENT, {
        traceHeaders,
        skipTraceHeaders,
        timeoutMs,
    });

    // Логируем запрос для отладки (можно убрать в production)
    if (process.env.NODE_ENV !== 'production') {
        tslgLogger.debug(`Full headers: ${JSON.stringify(headers)}`, HTTP_CLIENT,);
    }

    // Дополнительная страховка через Promise.race.
    // Гарантирует, что промис сбросится, даже если нативный таймаут fetch по какой-то причине не отработает.
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`HTTP request timed out after ${timeoutMs}ms: ${options.method || 'GET'} ${url}`));
        }, timeoutMs);
    });

    try {
        const response = await Promise.race([
            fetch(url, finalOptions),
            timeoutPromise
        ]);
        return response;
    } finally {
        // Всегда очищаем таймаут, чтобы избежать утечек памяти
        clearTimeout(timeoutHandle);
    }
}

module.exports = {
    tracedFetch,
};