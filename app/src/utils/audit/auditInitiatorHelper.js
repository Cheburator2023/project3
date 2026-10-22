const JwtHelper = require('./jwtHelper');
const HttpContextHelper = require('./httpContextHelper');
const ChannelNormalizer = require('./channelNormalizer');

/**
 * Класс-хелпер для централизованного формирования информации об инициаторе
 * события аудита.
 *
 * Соответствует требованиям
 * 43_1_СС_Аудит_Описание_схем_данных_СУМ и контракту 24. vtb:
 *   - initiator_sub              — уникальный идентификатор инициатора (JWT sub/preferred_username)
 *   - initiator_userSessionId    — ID пользовательской сессии (JWT ctxi/session_state)
 *   - initiator_realm            — realm (JWT realm или из iss)
 *   - initiator_clientAppId      — client_id/azp из JWT
 *   - initiator_channel          — internal/external/apic/service/smmb/SMBGuest/trust
 *                                  (options.channel -> JWT channel -> x-channel -> ENV -> 'unknown')
 *   - initiator_sourceIp         — IP инициатора (XFF / req.ip)
 *   - context_url                — URL аудируемой операции
 *   - context_method             — HTTP-метод
 *   - context_nearbyNodeIp       — IP ближайшего узла (RemoteAddr)
 *   - staff_id                   — subjectCode РМ (через RoleModelClient) или fallback
 *   - staff_roleId               — roleCode РМ (через RoleModelClient) или fallback
 */
class AuditInitiatorHelper {

    /**
     * Полная информация об инициаторе.
     *
     * @param {Object} context - контекст запроса (user, req)
     * @param {Object} [options]
     * @param {string} [options.channel]   - приоритетный источник для initiator_channel
     * @param {string} [options.url]       - URL операции (переопределяет req)
     * @param {string} [options.method]    - HTTP-метод (переопределяет req)
     * @param {string} [options.sourceIp]  - IP инициатора
     * @param {string} [options.nearbyNodeIp] - IP ближайшего узла
     * @param {Object} [options.roleModel] - { staffId, staffRoleId } из РМ (приоритет выше JWT)
     * @param {string} [options.sub]       - идентификатор инициатора (переопределяет JWT)
     * @param {string} [options.realm]     - realm (переопределяет JWT)
     * @param {string} [options.clientAppId] - clientAppId (переопределяет JWT)
     * @param {string} [options.userSessionId] - userSessionId (переопределяет JWT)
     */
    static build(context = {}, options = {}) {
        const safeContext = context || {};
        const user = safeContext.user || {};
        const req = safeContext.req || safeContext.request || {};

        const tokenPayload = JwtHelper.extractTokenPayload(user);
        const jwtData = JwtHelper.fromJwt(tokenPayload);

        const roleModel = options.roleModel || {};

        const url = options.url
            || HttpContextHelper.extractContextUrl(req)
            || null;
        const method = options.method || req.method || null;
        const sourceIp = options.sourceIp
            || HttpContextHelper.extractSourceIp(req)
            || '127.0.0.1';
        const nearbyNodeIp = options.nearbyNodeIp
            || HttpContextHelper.extractNearbyNodeIp(req)
            || null;

        // Определяем sub для нормализации канала
        const sub = options.sub
            || user.preferred_username
            || user.username
            || jwtData.sub
            || 'system';

        return {
            sub: sub,
            realm: options.realm
                || user.realm
                || jwtData.realm
                || 'staff',
            channel: ChannelNormalizer.resolveChannel(jwtData, req, sub, options.channel),
            clientAppId: options.clientAppId
                || jwtData.clientAppId
                || null,
            userSessionId: options.userSessionId
                || user.session
                || jwtData.userSessionId
                || null,

            // staff_id / staff_roleId: приоритет — ролевая модель (РМ),
            // fallback — JWT (TechDebt, если РМ недоступна).
            staffId: roleModel.staffId
                || jwtData.staffId
                || null,
            staffRoleId: roleModel.staffRoleId
                || jwtData.staffRoleId
                || null,

            url,
            method,
            sourceIp,
            nearbyNodeIp,
        };
    }

    /**
     * Возвращает пустую структуру инициатора.
     */
    static empty() {
        return JwtHelper.empty();
    }
}

module.exports = AuditInitiatorHelper;