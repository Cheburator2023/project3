const { TECHNICAL_CHANNELS, VALID_CHANNELS } = require('./auditConstants');

/**
 * Хелпер для нормализации значений канала (initiator_channel).
 */
class ChannelNormalizer {
    /**
     * Нормализует значение initiator_channel согласно контракту 24. vtb.
     * Технические значения (http, kafka, graphql и т.д.) маппятся в internal или service.
     *
     * @param {string} channel - исходное значение канала
     * @param {string} sub - идентификатор инициатора (для определения системности)
     * @returns {string} - нормализованное значение канала
     */
    static normalizeChannel(channel, sub) {
        if (!channel) {
            return 'unknown';
        }

        const ch = String(channel).toLowerCase().trim();

        if (TECHNICAL_CHANNELS.has(ch)) {
            // Если инициатор — системный пользователь, возвращаем service,
            // иначе считаем, что это internal (пользовательский запрос)
            const isSystem = sub === 'system' || sub === 'kafka' ||
                sub === 'bpmn' || sub === 'validation' ||
                sub === 'keycloak';
            return isSystem ? 'service' : 'internal';
        }

        if (VALID_CHANNELS.has(ch)) {
            // Приводим к каноническому виду SMBGuest
            return ch === 'smbguest' ? 'SMBGuest' : ch;
        }

        // Если канал неизвестен, возвращаем internal как безопасное значение
        return 'internal';
    }

    /**
     * Определяет initiator_channel по иерархии:
     *  - JWT channel
     *  - заголовок x-channel
     *  - process.env.DEFAULT_INITIATOR_CHANNEL
     *  - 'unknown'
     * с последующей нормализацией.
     */
    static resolveChannel(jwtData, req, sub) {
        let channel = null;

        if (jwtData && jwtData.channel) {
            channel = jwtData.channel;
        } else if (req && req.headers) {
            const headerChannel = req.headers['x-channel'];
            if (headerChannel && String(headerChannel).trim()) {
                channel = String(headerChannel).trim();
            }
        }

        if (!channel && process.env.DEFAULT_INITIATOR_CHANNEL) {
            channel = process.env.DEFAULT_INITIATOR_CHANNEL;
        }

        return ChannelNormalizer.normalizeChannel(channel, sub);
    }
}

module.exports = ChannelNormalizer;