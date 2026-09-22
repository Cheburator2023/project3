const fetch = require('isomorphic-fetch');
const { v4: uuidv4 } = require('uuid');
const { getTracingIds } = require('../tracingContext');
const tslgLogger = require('../logger');
const AuditBuffer = require('./auditBuffer');
const auditMetrics = require('./auditMetrics');

/**
 * Клиент для отправки событий аудита в сайдкар audit-sidecar
 *
 * Контракт остаётся неизменным: POST /api/v2/audit с полями
 * { eventCode, eventClass, correlationId, timestamp, initiator, additionalFields }.
 *
 * Дополнительно:
 *   - при ошибке HTTP (сеть, 5xx, таймаут) событие складывается в AuditBuffer;
 *   - фоновый таймер пытается досылать буфер с rate limiting;
 *   - экспоненциальный backoff при 5xx/timeout.
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

        this.buffer = new AuditBuffer({
            sendHandler: async (payload) => this._sendDirect(payload, true),
        });
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
        const tracingIds = getTracingIds() || { traceId: null, spanId: null };
        const payload = {
            eventCode,
            eventClass: 'START',
            correlationId,
            timestamp: new Date().toISOString(),
            initiator: initiatorInfo || {},
            additionalFields: {
                ...additionalFields,
                traceId: tracingIds.traceId,
                spanId: tracingIds.spanId,
            },
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
        const tracingIds = getTracingIds() || { traceId: null, spanId: null };
        const payload = {
            eventCode,
            eventClass: 'SUCCESS',
            correlationId,
            timestamp: new Date().toISOString(),
            initiator: initiatorInfo || {},
            additionalFields: {
                ...additionalFields,
                traceId: tracingIds.traceId,
                spanId: tracingIds.spanId,
            },
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
        const tracingIds = getTracingIds() || { traceId: null, spanId: null };
        const payload = {
            eventCode,
            eventClass: 'FAILURE',
            correlationId,
            timestamp: new Date().toISOString(),
            initiator: initiatorInfo || {},
            additionalFields: {
                ...additionalFields,
                traceId: tracingIds.traceId,
                spanId: tracingIds.spanId,
                errorMessage: error?.message || String(error),
                errorStack: error?.stack || null,
            },
        };
        await this._send(payload);
    }

    /**
     * Основной канал отправки. При успехе — ничего не делает.
     * При ошибке — кладёт payload в буфер (для неблокирующего поведения).
     */
    async _send(payload) {
        try {
            await this._sendDirect(payload, false);
        } catch (err) {
            tslgLogger.warn(
                `[Audit] Failed to send ${payload.eventClass}/${payload.eventCode}, buffering`,
                'AuditClient',
                { error: err && err.message }
            );
            this.buffer.enqueue(payload);
        }
    }

    /**
     * Прямая отправка payload в сайдкар.
     *
     * @param {Object} payload
     * @param {boolean} isResend - true, если отправка идёт из буфера
     */
    async _sendDirect(payload, isResend) {
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(
                () => reject(new Error(`Audit sidecar timeout after ${this.timeout} ms`)),
                this.timeout
            );
        });

        const fetchPromise = fetch(this.sidecarUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        try {
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                const err = new Error(
                    `Audit sidecar responded with ${response.status}: ${errorText}`
                );
                err.status = response.status;
                throw err;
            }

            tslgLogger.debug(
                `[Audit] ${isResend ? '(resend) ' : ''}${payload.eventClass}/${payload.eventCode} sent, correlationId=${payload.correlationId}`,
                'AuditClient',
                {
                    eventCode: payload.eventCode,
                    eventClass: payload.eventClass,
                    correlationId: payload.correlationId,
                }
            );
        } finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    }

    /**
     * Принудительно досылает буфер.
     */
    async forceFlush() {
        return this.buffer.forceFlush();
    }

    /**
     * Корректно останавливает буфер (flush + сохранение на диск).
     */
    async shutdown() {
        return this.buffer.shutdown();
    }

    getMetrics() {
        return auditMetrics.getAll();
    }
}

const sidecarUrl = process.env.AUDIT_SIDECAR_URL || 'http://localhost:8081/api/v2/audit';
const timeout = parseInt(process.env.AUDIT_SIDECAR_TIMEOUT, 10) || 5000;
const enabled = process.env.AUDIT_ENABLED === 'true';

module.exports = new AuditClient(sidecarUrl, timeout, enabled);
module.exports.AuditClient = AuditClient;