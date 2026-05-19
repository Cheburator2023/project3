const auditClient = require('./auditClient');

const EVENT_CODES = [
    'SUMD_CREATEMODEL',
    'SUMD_REMOVEMODEL',
    'SUMD_CANCELMODEL',
    'SUMD_UPLOADREPORT',
    'SUMD_TASKCOMPLETE',
    'SUMD_AUTH',
    'SUMD_ROLLBACKMODEL'
];

/**
 * Запускает генератор аудит-событий, который каждую секунду отправляет случайное событие.
 * @param {number} intervalMs интервал в миллисекундах (по умолчанию 1000)
 */
function startAuditGenerator(intervalMs = 1000) {
    console.log(`[AuditGenerator] Starting generator with interval ${intervalMs}ms`);
    return setInterval(async () => {
        const randomCode = EVENT_CODES[Math.floor(Math.random() * EVENT_CODES.length)];
        const isFailure = Math.random() > 0.7; // 30% ошибок
        const initiatorInfo = {
            sub: 'test_user',
            realm: 'staff',
            channel: 'generator',
            url: '/api/test',
            method: 'TEST'
        };
        const additionalFields = {
            generatedBy: 'generator',
            randomValue: Math.random(),
        };
        let correlationId;
        try {
            correlationId = await auditClient.start(randomCode, initiatorInfo, additionalFields);
            if (isFailure) {
                throw new Error('Simulated failure for test');
            }
            await auditClient.success(randomCode, correlationId, initiatorInfo, { result: 'ok' });
            console.log(`[Generator] Sent ${randomCode}/SUCCESS, correlationId=${correlationId}`);
        } catch (err) {
            await auditClient.failure(randomCode, correlationId, err, initiatorInfo, { error: err.message });
            console.log(`[Generator] Sent ${randomCode}/FAILURE, correlationId=${correlationId}`);
        }
    }, intervalMs);
}

module.exports = { startAuditGenerator };