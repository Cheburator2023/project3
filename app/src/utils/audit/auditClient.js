const fetch = require('isomorphic-fetch');
const { v4: uuidv4 } = require('uuid');

/**
 * Клиент для отправки событий аудита в сайдкар audit-sidecar
 *
 */
class AuditClient {
    /**
     * @param {string} sidecarUrl - URL эндпоинта сайдкара (v2)
     * @param {number} timeout - таймаут запроса в миллисекундах
     * @param {boolean} enabled - включена ли отправка аудита
     */
    constructor(sidecarUrl, timeout = 5000, enabled = true) {
        this.sidecarUrl = sidecarUrl;
        this.timeout = timeout;
        this.enabled = enabled;
    }

    /**
     * Отправляет событие START и возвращает correlationId.
     * @param {string} eventCode
     * @param {Object} initiatorInfo - { sub, realm, channel, url, method, sourceIp, ... }
     * @param {Object} additionalFields
     * @returns {Promise<string>} correlationId
     */
    async start(eventCode, initiatorInfo = {}, additionalFields = {}) {
        if (!this.enabled) return null;
        const correlationId = uuidv4();
        const payload = {
            eventCode,
            eventClass: 'START',
            correlationId,
            timestamp: new Date().toISOString(),
            initiator: initiatorInfo,
            additionalFields,
        };
        await this._send(payload);
        return correlationId;
    }

    /**
     * Отправляет событие SUCCESS.
     * @param {string} eventCode
     * @param {string} correlationId
     * @param {Object} initiatorInfo
     * @param {Object} additionalFields
     */
    async success(eventCode, correlationId, initiatorInfo = {}, additionalFields = {}) {
        if (!this.enabled) return;
        const payload = {
            eventCode,
            eventClass: 'SUCCESS',
            correlationId,
            timestamp: new Date().toISOString(),
            initiator: initiatorInfo,
            additionalFields,
        };
        await this._send(payload);
    }

    /**
     * Отправляет событие FAILURE.
     * @param {string} eventCode
     * @param {string} correlationId
     * @param {Error} error
     * @param {Object} initiatorInfo
     * @param {Object} additionalFields
     */
    async failure(eventCode, correlationId, error, initiatorInfo = {}, additionalFields = {}) {
        if (!this.enabled) return;
        const payload = {
            eventCode,
            eventClass: 'FAILURE',
            correlationId,
            timestamp: new Date().toISOString(),
            initiator: initiatorInfo,
            additionalFields: {
                ...additionalFields,
                errorMessage: error.message,
                errorStack: error.stack,
            },
        };
        await this._send(payload);
    }

    /**
     * Внутренний метод отправки HTTP-запроса в сайдкар.
     */
    async _send(payload) {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Audit sidecar timeout after ${this.timeout} ms`)), this.timeout)
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
            console.debug(`[Audit] ${payload.eventClass}/${payload.eventCode} sent, correlationId=${payload.correlationId}`);
        } catch (error) {
            console.error(`[Audit] Failed to send ${payload.eventClass}/${payload.eventCode}:`, error.message);
        }
    }
}

const sidecarUrl = process.env.AUDIT_SIDECAR_URL || 'http://localhost:8081/api/v2/audit';
const timeout = parseInt(process.env.AUDIT_SIDECAR_TIMEOUT, 10) || 5000;
const enabled = process.env.AUDIT_ENABLED !== 'true';

module.exports = new AuditClient(sidecarUrl, timeout, enabled);