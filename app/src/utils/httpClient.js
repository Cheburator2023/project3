const fetch = require('isomorphic-fetch');
const { getOutgoingTraceHeaders } = require('./tracingContext');
const tslgLogger = require('./logger');
const HTTP_CLIENT = 'HttpClient';

// Таймаут HTTP-запросов по умолчанию.
// Нужен, чтобы избежать бесконечных зависаний при недоступности/зависании
// удалённого сервиса (isomorphic-fetch / node-fetch v2 не имеют
// дефолтного таймаута на уровне fetch).
// Значение переопределяется через переменную окружения HTTP_CLIENT_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = 15000;
const HTTP_TIMEOUT_MS = (() => {
    const parsed = parseInt(process.env.HTTP_CLIENT_TIMEOUT_MS, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
})();

/**
 * Выполняет HTTP-запрос с автоматическим добавлением заголовков трассировки
 * и защитным таймаутом (AbortController).
 *
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

    // Защитный таймаут через AbortController.
    // Если вызывающая сторона уже передала свой signal — используем его.
    // Иначе создаём собственный и отменяем его по достижении HTTP_TIMEOUT_MS.
    const controller = new AbortController();
    const signal = options.signal || controller.signal;

    const finalOptions = {
        ...options,
        headers,
        signal,
    };

    let timeoutId;
    if (!options.signal) {
        timeoutId = setTimeout(() => {
            controller.abort();
        }, HTTP_TIMEOUT_MS);
    }

    tslgLogger.info(`TracedFetch: ${options.method || 'GET'} ${url}`, HTTP_CLIENT, {
        traceHeaders,
        skipTraceHeaders,
        timeoutMs: options.signal ? null : HTTP_TIMEOUT_MS,
    });

    // Логируем запрос для отладки (можно убрать в production)
    if (process.env.NODE_ENV !== 'production') {
        tslgLogger.info(`Full headers: ${JSON.stringify(headers)}`, HTTP_CLIENT);
    }

    try {
        return await fetch(url, finalOptions);
    } catch (error) {
        // Отдельно сигнализируем об отмене по таймауту — это важно для диагностики.
        if (error && error.name === 'AbortError') {
            tslgLogger.warn(
                `TracedFetch aborted after ${HTTP_TIMEOUT_MS}ms: ${options.method || 'GET'} ${url}`,
                HTTP_CLIENT,
            );
        }
        throw error;
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

module.exports = {
    tracedFetch,
};