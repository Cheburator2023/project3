/**
 * Простой in-process реестр счётчиков для метрик модуля аудита.
 *
 * Экспонирует счётчики:
 *   - audit_buffer_size
 *   - audit_buffer_flushed_total
 *   - audit_buffer_overflow_total
 *   - audit_buffer_dropped_total
 *   - audit_buffer_send_errors_total
 */
class AuditMetrics {
    constructor() {
        this.counters = new Map();
        this.gauges = new Map();
    }

    increment(name, value = 1) {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + value);
    }

    set(name, value) {
        this.gauges.set(name, value);
    }

    get(name) {
        if (this.counters.has(name)) {
            return this.counters.get(name);
        }
        return this.gauges.get(name) || 0;
    }

    getAll() {
        const result = {};
        this.counters.forEach((v, k) => { result[k] = v; });
        this.gauges.forEach((v, k) => { result[k] = v; });
        return result;
    }

    reset() {
        this.counters.clear();
        this.gauges.clear();
    }
}

module.exports = new AuditMetrics();