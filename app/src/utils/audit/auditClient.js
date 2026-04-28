const fetch = require('isomorphic-fetch');

/**
 * Клиент для отправки событий аудита в сайдкар.
 * Использует `fetch` для HTTP-запросов, асинхронен, не блокирует выполнение.
 */
class AuditClient {
    /**
     * @param {string} sidecarUrl - URL эндпоинта сайдкара (например, http://localhost:8081/api/v1/audit)
     * @param {number} timeout - таймаут запроса в миллисекундах
     */
    constructor(sidecarUrl, timeout = 5000) {
        this.sidecarUrl = sidecarUrl;
        this.timeout = timeout;
    }

    /**
     * Отправить событие аудита.
     * @param {string} eventCode - код события (должен быть зарегистрирован в сайдкаре)
     * @param {string} eventClass - класс события: 'START', 'SUCCESS', 'FAILURE'
     * @param {Object} additionalFields - дополнительные поля, которые будут переданы в `additionalFields` запроса
     * @param {string} [timestamp] - ISO-строка времени события (по умолчанию текущее)
     * @returns {Promise<Object>} - ответ сайдкара
     * @throws {Error} - если запрос не удался (может быть перехвачен вызывающим кодом)
     */
    async send(eventCode, eventClass, additionalFields = {}, timestamp = new Date().toISOString()) {
        const payload = {
            eventCode,
            eventClass,
            timestamp,
            additionalFields,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.sidecarUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Audit sidecar responded with ${response.status}: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[AuditClient] Failed to send event ${eventCode}/${eventClass}:`, error.message);
            throw error;
        }
    }
}

// Создаём единственный экземпляр с настройками из окружения
const sidecarUrl = process.env.AUDIT_SIDECAR_URL || 'http://localhost:8081/api/v1/audit';
const timeout = parseInt(process.env.AUDIT_SIDECAR_TIMEOUT, 10) || 5000;

module.exports = new AuditClient(sidecarUrl, timeout);