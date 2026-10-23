const fs = require('fs');
const path = require('path');
const tslgLogger = require('../logger');
const auditMetrics = require('./auditMetrics');

const DEFAULT_CAPACITY = parseInt(process.env.AUDIT_BUFFER_CAPACITY, 10) || 10000;
const DEFAULT_RESEND_CRON_MS = parseInt(process.env.AUDIT_RESEND_CRON_MS, 10) || 10 * 60 * 1000;
const DEFAULT_DELAY_FORCE_SEND_MS = parseInt(process.env.AUDIT_DELAY_FORCE_SEND_MS, 10) || 300 * 1000;
const DEFAULT_RESEND_RPS = parseInt(process.env.AUDIT_RESEND_RPS, 10) || 20;
const DEFAULT_BUFFER_FILE = process.env.AUDIT_BUFFER_FILE || null;
const MAX_BACKOFF_MS = 60 * 1000;

/**
 * Циклический буфер неотправленных событий аудита.
 *
 * Особенности:
 *   - фиксированная ёмкость (circular): при переполнении вытесняет
 *     самые старые события и увеличивает audit_buffer_overflow_total;
 *   - по расписанию (setInterval) пытается досылать буфер;
 *   - если после последней ошибки прошло delayForceSendMs — форсированная досылка;
 *   - rate limiting (resendRps) при досылке;
 *   - экспоненциальный backoff (capped) при 5xx/timeout.
 */
class AuditBuffer {
    /**
     * @param {Object} options
     * @param {Function} options.sendHandler - async (payload) => void, отправляет одно событие
     * @param {number} [options.capacity]
     * @param {number} [options.resendCronMs]
     * @param {number} [options.delayForceSendMs]
     * @param {number} [options.resendRps]
     * @param {string} [options.bufferFile] - путь к файлу для персистентности (optional)
     */
    constructor(options = {}) {
        this.sendHandler = options.sendHandler;
        this.capacity = options.capacity || DEFAULT_CAPACITY;
        this.resendCronMs = options.resendCronMs || DEFAULT_RESEND_CRON_MS;
        this.delayForceSendMs = options.delayForceSendMs || DEFAULT_DELAY_FORCE_SEND_MS;
        this.resendRps = options.resendRps || DEFAULT_RESEND_RPS;
        this.bufferFile = options.bufferFile || DEFAULT_BUFFER_FILE;

        this.buffer = [];
        this.head = 0;
        this.size_ = 0;

        this.lastErrorAt = 0;
        this.backoffMs = 1000;
        this.isFlushing = false;
        this.timer = null;
        this.isShuttingDown = false;

        this._loadFromDisk();
        this._updateSizeMetric();
        this._startTimer();
    }

    /**
     * Добавляет событие в буфер. Если буфер полон — вытесняет старейшее.
     */
    enqueue(payload) {
        if (this.size_ >= this.capacity) {
            // Вытесняем старейшее
            this.buffer[this.head] = null;
            this.head = (this.head + 1) % this.capacity;
            this.size_ -= 1;
            auditMetrics.increment('audit_buffer_overflow_total');
            tslgLogger.warn(
                `[AuditBuffer] Buffer overflow, dropping oldest event (capacity=${this.capacity})`,
                'AuditBuffer'
            );
        }

        const tail = (this.head + this.size_) % this.capacity;
        this.buffer[tail] = payload;
        this.size_ += 1;

        this._updateSizeMetric();
        this._saveToDiskDebounced();
    }

    /**
     * Возвращает верхний элемент без удаления.
     */
    peek() {
        if (this.size_ === 0) return null;
        return this.buffer[this.head];
    }

    /**
     * Возвращает текущий размер буфера.
     */
    size() {
        return this.size_;
    }

    /**
     * Удаляет верхний элемент.
     */
    dequeue() {
        if (this.size_ === 0) return null;
        const item = this.buffer[this.head];
        this.buffer[this.head] = null;
        this.head = (this.head + 1) % this.capacity;
        this.size_ -= 1;
        this._updateSizeMetric();
        return item;
    }

    /**
     * Пытается дослать все события из буфера.
     *
     * @param {boolean} force - если true, игнорирует delayForceSendMs
     */
    async flush(force = false) {
        if (this.isFlushing) {
            return;
        }

        if (this.size_ === 0) {
            return;
        }

        if (!force) {
            // Backoff после недавней ошибки
            const elapsed = Date.now() - this.lastErrorAt;
            if (this.lastErrorAt > 0 && elapsed < this.backoffMs) {
                return;
            }
        }

        this.isFlushing = true;
        const startedAt = Date.now();
        const minIntervalMs = this.resendRps > 0 ? Math.ceil(1000 / this.resendRps) : 0;
        let sent = 0;
        let failed = false;

        try {
            while (this.size_ > 0) {
                const payload = this.peek();

                if (payload == null) {
                    // Защита от race condition
                    this.dequeue();
                    continue;
                }

                const tick = Date.now();
                try {
                    await this.sendHandler(payload);
                    this.dequeue();
                    sent += 1;
                    auditMetrics.increment('audit_buffer_flushed_total');

                    // Если хотя бы одно событие ушло — сбрасываем backoff
                    this.backoffMs = 1000;
                } catch (err) {
                    failed = true;
                    this.lastErrorAt = Date.now();
                    auditMetrics.increment('audit_buffer_send_errors_total');
                    tslgLogger.warn(
                        `[AuditBuffer] Failed to resend buffered event: ${err && err.message}`,
                        'AuditBuffer',
                        { error: err && err.message, remaining: this.size_ }
                    );
                    // Экспоненциальный backoff (capped)
                    this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
                    break;
                }

                if (minIntervalMs > 0) {
                    const elapsedTick = Date.now() - tick;
                    const wait = minIntervalMs - elapsedTick;
                    if (wait > 0) {
                        await new Promise((resolve) => setTimeout(resolve, wait));
                    }
                }

                // Ограничиваем обработку за один тик, чтобы не блокировать loop
                if (Date.now() - startedAt > 30000) {
                    break;
                }
            }
        } finally {
            this.isFlushing = false;
            this._saveToDiskDebounced();
        }

        if (sent > 0) {
            tslgLogger.info(
                `[AuditBuffer] Flushed ${sent} buffered events, remaining=${this.size_}, failed=${failed}`,
                'AuditBuffer'
            );
        }
    }

    /**
     * Пытается форсированно дослать буфер.
     */
    async forceFlush() {
        return this.flush(true);
    }

    /**
     * Останавливает таймер и при возможности сохраняет буфер на диск.
     */
    async shutdown() {
        this.isShuttingDown = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this._saveToDiskSync();
    }

    _startTimer() {
        this.timer = setInterval(() => {
            if (this.isShuttingDown) return;

            const force = this.size_ > 0 &&
                this.lastErrorAt > 0 &&
                (Date.now() - this.lastErrorAt >= this.delayForceSendMs);

            this.flush(force).catch((err) => {
                tslgLogger.warn(
                    `[AuditBuffer] Timer flush failed: ${err && err.message}`,
                    'AuditBuffer'
                );
            });
        }, this.resendCronMs);
        // Не блокируем завершение процесса
        if (this.timer.unref) {
            this.timer.unref();
        }
    }

    _updateSizeMetric() {
        auditMetrics.set('audit_buffer_size', this.size_);
    }

    _loadFromDisk() {
        if (!this.bufferFile) {
            return;
        }
        try {
            if (fs.existsSync(this.bufferFile)) {
                const raw = fs.readFileSync(this.bufferFile, 'utf8');
                const items = JSON.parse(raw);
                if (Array.isArray(items)) {
                    items.slice(-this.capacity).forEach((item) => this.enqueue(item));
                    tslgLogger.info(
                        `[AuditBuffer] Restored ${this.size_} events from disk`,
                        'AuditBuffer'
                    );
                }
            }
        } catch (err) {
            tslgLogger.warn(
                `[AuditBuffer] Failed to restore buffer from disk: ${err.message}`,
                'AuditBuffer'
            );
        }
    }

    _saveToDiskDebounced() {
        if (!this.bufferFile) return;
        if (this._saveTimer) return;
        this._saveTimer = setTimeout(() => {
            this._saveTimer = null;
            this._saveToDiskSync();
        }, 5000);
        if (this._saveTimer.unref) {
            this._saveTimer.unref();
        }
    }

    _saveToDiskSync() {
        if (!this.bufferFile) return;
        try {
            const items = [];
            for (let i = 0; i < this.size_; i += 1) {
                const idx = (this.head + i) % this.capacity;
                if (this.buffer[idx] != null) {
                    items.push(this.buffer[idx]);
                }
            }
            fs.mkdirSync(path.dirname(this.bufferFile), { recursive: true });
            fs.writeFileSync(this.bufferFile, JSON.stringify(items), 'utf8');
        } catch (err) {
            tslgLogger.warn(
                `[AuditBuffer] Failed to save buffer to disk: ${err.message}`,
                'AuditBuffer'
            );
        }
    }
}

module.exports = AuditBuffer;