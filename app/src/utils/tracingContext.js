const { context, trace, SpanStatusCode } = require('@opentelemetry/api');
const tslgLogger = require('./logger');
const TRACING_CONTEXT = 'TracingContext';

/**
 * Получает текущий trace_id и span_id из активного контекста OpenTelemetry.
 * Возвращает объект с полями:
 *   - traceId: строка (32 шестнадцатеричных символа) или null
 *   - spanId: строка (16 шестнадцатеричных символов) или null
 */
function getTracingIds() {
    const currentContext = context.active();
    const currentSpan = trace.getSpan(currentContext);
    if (!currentSpan) {
        tslgLogger.info('No active span, tracing IDs are null', TRACING_CONTEXT);
        return { traceId: null, spanId: null };
    }
    const spanContext = currentSpan.spanContext();
    const result = {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
    };
    tslgLogger.info(`Retrieved traceId=${result.traceId}, spanId=${result.spanId}`, TRACING_CONTEXT);
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
    tslgLogger.info(`Starting root span for background task: ${spanName}`, TRACING_CONTEXT);
    const tracer = trace.getTracer('sum-background');
    return tracer.startActiveSpan(spanName, async (span) => {
        try {
            const result = await fn();
            span.setStatus({ code: SpanStatusCode.OK });
            tslgLogger.info(`Root span ${spanName} completed succsessfully`, TRACING_CONTEXT);
            return result;
        } catch (err) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
            span.recordException(err);
            tslgLogger.error(`Root span ${spanName} failed`, TRACING_CONTEXT, err);
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
        tslgLogger.info('No x-dynatrace header to set', TRACING_CONTEXT);
        return;
    }
    const currentCtx = context.active();
    // Сохраняем как пользовательский атрибут контекста
    const newCtx = currentCtx.setValue(Symbol.for('x-dynatrace'), headerValue);
    context.with(newCtx, () => {});
    tslgLogger.info(`x-dynatrace header set in context: ${headerValue}`, TRACING_CONTEXT);
}

/**
 * Получает сохранённый заголовок x-dynatrace из текущего контекста.
 * @returns {string|null}
 */
function getDynatraceHeader() {
    const currentCtx = context.active();
    const header = currentCtx.getValue(Symbol.for('x-dynatrace')) || null;
    if (header) {
        tslgLogger.info(`Retrived x-dynatrace header from context: ${header}`, TRACING_CONTEXT);
    } else {
        tslgLogger.info('No x-dynatrace header in context', TRACING_CONTEXT);
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
    // Стандартный заголовок для W3C Trace Context (добавляется автоматически HttpInstrumentation,
    // но мы добавим вручную для надёжности)
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
        const spanContext = currentSpan.spanContext();
        if (spanContext.traceId && spanContext.spanId) {
            // Формируем traceparent согласно спецификации W3C
            const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
            headers['traceparent'] = traceparent;
            tslgLogger.info(`Generated traceparent: ${headers['traceparent']}`, TRACING_CONTEXT);
        }
    }
    // Проприетарный заголовок Ключ-Астром
    const dynatraceHeader = getDynatraceHeader();
    if (dynatraceHeader) {
        headers['x-dynatrace'] = dynatraceHeader;
        tslgLogger.info(`Adding x-dynatrace to outgoing headers: ${dynatraceHeader}`, TRACING_CONTEXT);
    }
    if (Object.keys(headers).length === 0) {
        tslgLogger.info('No outgoing trace headers generated', TRACING_CONTEXT);
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