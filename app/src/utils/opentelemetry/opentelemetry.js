const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const tslgLogger = require("../logger");
const TRACING_INIT = 'TracingInit';

/**
 * Инициализация OpenTelemetry для интеграции с Ключ-Астром.
 * Создаёт SDK, регистрирует инструментации, устанавливает пропагатор.
 * Экспортер настраивается через переменные окружения:
 *   - OTEL_EXPORTER_OTLP_ENDPOINT – URL для отправки трасс (по умолчанию http://localhost:4318/v1/traces)
 *   - OTEL_SERVICE_NAME – имя сервиса (по умолчанию 'sum-backend')
 *   - OTEL_ENVIRONMENT – окружение (по умолчанию 'development')
 *
 * В production рекомендуется использовать OTLP экспортёр, в development – консольный для отладки.
 */
function initTracing() {
    tslgLogger.info('Initialization Opentelemetry SDK', TRACING_INIT);
    // Определяем, включён ли экспорт (по умолчанию включён, если задан endpoint)
    const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
    const useConsoleExporter = process.env.OTEL_USE_CONSOLE_EXPORTER === 'true' || !exporterEndpoint;

    let traceExporter;
    if (useConsoleExporter) {
        const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
        traceExporter = new ConsoleSpanExporter();
        tslgLogger.info('[OpenTelemetry] Using ConsoleSpanExporter (traces will be printed to console)', TRACING_INIT);
    } else {
        traceExporter = new OTLPTraceExporter({
            url: exporterEndpoint,
            // можно добавить заголовки, если требуется авторизация
            headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
                ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
                : undefined,
        });
        tslgLogger.info(`[OpenTelemetry] Using OTLP exporter to ${exporterEndpoint}`, TRACING_INIT);
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || 'sum-backend';
    const environment = process.env.OTEL_ENVIRONMENT || 'development';

    const sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            ['deployment.environment']: environment,
            ['service.version']: process.env.OTEL_SERVICE_VERSION || '1.0.0',
        }),
        traceExporter,
        spanProcessor: new BatchSpanProcessor(traceExporter, {
            maxQueueSize: 2048,
            scheduledDelayMillis: 5000,
        }),
        instrumentations: [
            new HttpInstrumentation({
                // Автоматически пропагировать контекст через заголовки
                propagateTraceHeaderCorsUrls: /.*/, // разрешить все исходящие запросы
                // можно настроить исключения для определённых URL, если требуется
            }),
            new ExpressInstrumentation({
                // автоматически создавать спаны для Express-запросов
                requestHook: (span, req) => {
                    // дополнительно можно задать имя спана или атрибуты
                    tslgLogger.info(`Express request hook: ${req.method} ${req.url}`, TRACING_INIT)
                },
            }),
        ],
        textMapPropagator: new W3CTraceContextPropagator(),
    });

    // Запускаем SDK
    sdk.start();

    // Добавляем глобальный обработчик для graceful shutdown
    process.on('SIGTERM', () => {
        sdk
            .shutdown()
            .then(() => console.log('[OpenTelemetry] SDK shut down successfully'))
            .catch((err) => console.error('[OpenTelemetry] Error shutting down SDK', err))
            .finally(() => process.exit(0));
    });
    process.on('SIGINT', () => {
        sdk
            .shutdown()
            .then(() => console.log('[OpenTelemetry] SDK shut down successfully'))
            .catch((err) => console.error('[OpenTelemetry] Error shutting down SDK', err))
            .finally(() => process.exit(0));
    });

    return sdk;
}

module.exports = { initTracing };