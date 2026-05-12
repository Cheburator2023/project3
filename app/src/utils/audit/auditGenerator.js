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
    return setInterval(() => {
        const randomCode = EVENT_CODES[Math.floor(Math.random() * EVENT_CODES.length)];
        const eventClass = Math.random() > 0.7 ? 'FAILURE' : 'SUCCESS'; // 30% ошибок
        const additionalFields = {
            generatedBy: 'generator',
            randomValue: Math.random(),
            timestamp: new Date().toISOString()
        };
        auditClient.send(randomCode, eventClass, additionalFields)
            .then(() => console.log(`[Generator] Sent ${randomCode}/${eventClass}`))
            .catch(err => console.error(`[Generator] Failed: ${err.message}`));
    }, intervalMs);
}

module.exports = { startAuditGenerator };