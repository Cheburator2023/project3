const fetch = require('isomorphic-fetch');

/**
 * Клиент для отправки событий аудита в сайдкар с отказоустойчивостью.
 * - Не выбрасывает исключений, только логирует ошибки.
 * - Поддерживает отключение через AUDIT_ENABLED=false.
 */
class AuditClient {
    /**
     * @param {string} sidecarUrl - URL эндпоинта сайдкара
     * @param {number} timeout - таймаут запроса в миллисекундах
     * @param {boolean} enabled - включена ли отправка аудита
     */
    constructor(sidecarUrl, timeout = 5000, enabled = true) {
        this.sidecarUrl = sidecarUrl;
        this.timeout = timeout;
        this.enabled = enabled;
    }

    /**
     * Отправить событие аудита (ошибки не пробрасываются).
     * @param {string} eventCode - код события (должен быть зарегистрирован в сайдкаре)
     * @param {string} eventClass - класс события: 'START', 'SUCCESS', 'FAILURE'
     * @param {Object} additionalFields - дополнительные поля, которые будут переданы в `additionalFields` запроса
     * @param {string} [timestamp] - ISO-строка времени события (по умолчанию текущее)
     * @returns {Promise<void>} – всегда резолвится, ошибки подавлены.
     */
    async send(eventCode, eventClass, additionalFields = {}, timestamp = new Date().toISOString()) {
        // Если аудит отключён – ничего не делаем
        if (!this.enabled) {
            return;
        }

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

            console.debug(`[Audit] Event ${eventCode}/${eventClass} sent`);
        } catch (error) {
            console.error(`[AuditClient] Failed to send event ${eventCode}/${eventClass}:`, error.message);
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

const sidecarUrl = process.env.AUDIT_SIDECAR_URL || 'http://localhost:8081/api/v1/audit';
const timeout = parseInt(process.env.AUDIT_SIDECAR_TIMEOUT, 10) || 5000;
const enabled = process.env.AUDIT_ENABLED !== 'false'; // по умолчанию true

module.exports = new AuditClient(sidecarUrl, timeout, enabled);