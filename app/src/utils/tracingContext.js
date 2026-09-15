const { context, trace, SpanStatusCode } = require('@opentelemetry/api');

/**
 * Флаг для отладочного вывода в tracingContext.
 * Включается через переменную окружения DEBUG_TRACING=true.
 * Вывод идёт напрямую в stdout, минуя логгер, чтобы не создавать циклическую зависимость.
 */
const DEBUG_TRACING = process.env.DEBUG_TRACING === 'true';

/**
 * Прямой вывод отладочного сообщения в stdout, минуя логгер.
 * Используется только внутри tracingContext для предотвращения рекурсии.
 */
function debugLog(message) {
    if (DEBUG_TRACING) {
        process.stdout.write(`[TracingContext][DEBUG] ${message}\n`);
    }
}

/**
 * Получает текущий trace_id и span_id из активного контекста OpenTelemetry.
 * Возвращает объект с полями:
 *   - traceId: строка (32 шестнадцатеричных символа) или null
 *   - spanId: строка (16 шестнадцатеричных символов) или null
 *
 * ВАЖНО: функция НЕ должна использовать логгер, так как вызывается из
 * TSLGLogger.createLogEntry() -> getTracingLogFields() -> getTracingIds().
 * Использование логгера здесь приводило бы к бесконечной рекурсии.
 */
function getTracingIds() {
    try {
        const currentContext = context.active();
        const currentSpan = trace.getSpan(currentContext);
        if (!currentSpan) {
            debugLog('No active span, tracing IDs are null');
            return { traceId: null, spanId: null };
        }
        const spanContext = currentSpan.spanContext();
        if (!spanContext) {
            debugLog('Span context is null, tracing IDs are null');
            return { traceId: null, spanId: null };
        }
        const result = {
            traceId: spanContext.traceId || null,
            spanId: spanContext.spanId || null,
        };
        debugLog(`Retrieved traceId=${result.traceId}, spanId=${result.spanId}`);
        return result;
    } catch (error) {
        debugLog(`Error retrieving tracing IDs: ${error.message}`);
        return { traceId: null, spanId: null };
    }
}

/**
 * Возвращает объект, который можно использовать для добавления в логи.
 * Соответствует ожидаемым ключам Ключ-Астром: dt.trace_id, dt.span_id.
 */
function getTracingLogFields() {
    const ids = getTracingIds();
    return {
        'dt.trace_id': ids.traceId,
        'dt.span_id': ids.spanId,
    };
}

/**
 * Выполняет переданную функцию в контексте нового корневого спана.
 * Используется для фоновых задач (scheduler), чтобы генерировать trace_id.
 * @param {string} spanName - имя спана
 * @param {Function} fn - асинхронная функция для выполнения
 * @returns {Promise<any>} результат fn
 */
async function runWithRootSpan(spanName, fn) {
    debugLog(`Starting root span for background task: ${spanName}`);
    const tracer = trace.getTracer('sum-background');
    return tracer.startActiveSpan(spanName, async (span) => {
        try {
            const result = await fn();
            span.setStatus({ code: SpanStatusCode.OK });
            debugLog(`Root span ${spanName} completed successfully`);
            return result;
        } catch (err) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            span.recordException(err);
            debugLog(`Root span ${spanName} failed: ${err.message}`);
            throw err;
        } finally {
            span.end();
        }
    });
}

/**
 * Сохраняет заголовок x-dynatrace в текущий контекст OpenTelemetry.
 * Чтобы его можно было извлечь в любом месте приложения.
 * @param {string} headerValue - значение заголовка x-dynatrace
 */
function setDynatraceHeader(headerValue) {
    if (!headerValue) {
        debugLog('No x-dynatrace header to set');
        return;
    }
    const currentCtx = context.active();
    // Сохраняем как пользовательский атрибут контекста
    const newCtx = currentCtx.setValue(Symbol.for('x-dynatrace'), headerValue);
    context.with(newCtx, () => {});
    debugLog(`x-dynatrace header set in context: ${headerValue}`);
}

/**
 * Получает сохранённый заголовок x-dynatrace из текущего контекста.
 * @returns {string|null}
 */
function getDynatraceHeader() {
    const currentCtx = context.active();
    const header = currentCtx.getValue(Symbol.for('x-dynatrace')) || null;
    if (header) {
        debugLog(`Retrieved x-dynatrace header from context: ${header}`);
    } else {
        debugLog('No x-dynatrace header in context');
    }
    return header;
}

/**
 * Возвращает объект заголовков, который следует добавить в исходящий HTTP-запрос.
 * Включает стандартный W3C Trace Context и проприетарный x-dynatrace,
 * если он присутствует в контексте.
 */
function getOutgoingTraceHeaders() {
    const headers = {};
    try {
        // Стандартный заголовок для W3C Trace Context (добавляется автоматически HttpInstrumentation,
        // но мы добавим вручную для надёжности)
        const currentSpan = trace.getSpan(context.active());
        if (currentSpan) {
            const spanContext = currentSpan.spanContext();
            if (spanContext && spanContext.traceId && spanContext.spanId) {
                // Формируем traceparent согласно спецификации W3C
                headers['traceparent'] = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
                debugLog(`Generated traceparent: ${headers['traceparent']}`);
            }
        }
        // Проприетарный заголовок Ключ-Астром
        const dynatraceHeader = getDynatraceHeader();
        if (dynatraceHeader) {
            headers['x-dynatrace'] = dynatraceHeader;
            debugLog(`Adding x-dynatrace to outgoing headers: ${dynatraceHeader}`);
        }
    } catch (error) {
        debugLog(`Error generating outgoing trace headers: ${error.message}`);
    }
    if (Object.keys(headers).length === 0) {
        debugLog('No outgoing trace headers generated');
    }
    return headers;
}

module.exports = {
    getTracingIds,
    getTracingLogFields,
    runWithRootSpan,
    setDynatraceHeader,
    getDynatraceHeader,
    getOutgoingTraceHeaders,
};