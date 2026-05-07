const fetch = require('isomorphic-fetch');

/**
 * Клиент для отправки событий аудита в сайдкар с отказоустойчивостью и ретраями.
 */
class AuditClient {
    /**
     * @param {string} sidecarUrl - URL эндпоинта сайдкара
     * @param {number} timeout - таймаут одного запроса в миллисекундах
     * @param {boolean} enabled - включена ли отправка аудита
     * @param {number} retryCount - максимальное количество попыток
     * @param {number} retryDelayMs - начальная задержка между попытками (мс)
     * @param {number} retryBackoffMultiplier - множитель экспоненциальной задержки
     */
    constructor(sidecarUrl, timeout = 5000, enabled = true,
                retryCount = 3, retryDelayMs = 1000, retryBackoffMultiplier = 2) {
        this.sidecarUrl = sidecarUrl;
        this.timeout = timeout;
        this.enabled = enabled;
        this.retryCount = retryCount;
        this.retryDelayMs = retryDelayMs;
        this.retryBackoffMultiplier = retryBackoffMultiplier;
    }

    /**
     * Отправить событие аудита с повторными попытками.
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

        let lastError = null;
        let currentDelay = this.retryDelayMs;

        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                await this._sendOnce(payload);
                console.debug(`[Audit] Event ${eventCode}/${eventClass} sent (attempt ${attempt})`);
                return;
            } catch (error) {
                lastError = error;
                console.error(`[AuditClient] Attempt ${attempt}/${this.retryCount} failed for ${eventCode}/${eventClass}: ${error.message}`);
                if (attempt < this.retryCount) {
                    await this._delay(currentDelay);
                    currentDelay *= this.retryBackoffMultiplier;
                }
            }
        }

        console.error(`[AuditClient] All ${this.retryCount} attempts failed for ${eventCode}/${eventClass}:`, lastError?.message);
    }

    /**
     * Одиночный запрос без ретраев.
     * @private
     */
    async _sendOnce(payload) {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${this.timeout} ms`)), this.timeout)
        );

        const fetchPromise = fetch(this.sidecarUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Audit sidecar responded with ${response.status}: ${errorText}`);
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const sidecarUrl = process.env.AUDIT_SIDECAR_URL || 'http://localhost:8081/api/v1/audit';
const timeout = parseInt(process.env.AUDIT_SIDECAR_TIMEOUT, 10) || 5000;
const enabled = process.env.AUDIT_ENABLED !== 'false';
const retryCount = parseInt(process.env.AUDIT_SIDECAR_RETRY_COUNT, 10) || 3;
const retryDelayMs = parseInt(process.env.AUDIT_SIDECAR_RETRY_DELAY_MS, 10) || 1000;
const retryBackoffMultiplier = parseFloat(process.env.AUDIT_SIDECAR_RETRY_BACKOFF_MULTIPLIER) || 2;

module.exports = new AuditClient(sidecarUrl, timeout, enabled, retryCount, retryDelayMs, retryBackoffMultiplier);