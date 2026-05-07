const fetch = require('isomorphic-fetch');

/**
 * Клиент для отправки событий аудита в сайдкар с отказоустойчивостью.
 * Не использует AbortController для совместимости со старыми версиями Node.js.
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
     * Отправить событие аудита (безопасно – ошибки не пробрасываются наружу).
     * @param {string} eventCode
     * @param {string} eventClass
     * @param {Object} additionalFields
     * @param {string} timestamp
     * @returns {Promise<void>}
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

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${this.timeout} ms`)), this.timeout)
        );

        const fetchPromise = fetch(this.sidecarUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        try {
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Audit sidecar responded with ${response.status}: ${errorText}`);
            }

            console.debug(`[Audit] Event ${eventCode}/${eventClass} sent`);
        } catch (error) {
            console.error(`[AuditClient] Failed to send event ${eventCode}/${eventClass}:`, error.message);
        }
    }
}

const sidecarUrl = process.env.AUDIT_SIDECAR_URL || 'http://localhost:8081/api/v1/audit';
const timeout = parseInt(process.env.AUDIT_SIDECAR_TIMEOUT, 10) || 5000;
const enabled = process.env.AUDIT_ENABLED !== 'false';

module.exports = new AuditClient(sidecarUrl, timeout, enabled);