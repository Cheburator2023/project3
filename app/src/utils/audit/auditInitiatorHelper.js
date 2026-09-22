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
 *                                  (JWT channel → x-channel → ENV → 'unknown')
 *   - initiator_sourceIp         — IP инициатора (XFF / req.ip)
 *   - context_url                — URL аудируемой операции
 *   - context_method             — HTTP-метод
 *   - context_nearbyNodeIp       — IP ближайшего узла (RemoteAddr)
 *   - staff_id                   — subjectCode РМ (через RoleModelClient) или fallback
 *   - staff_roleId               — roleCode РМ (через RoleModelClient) или fallback
 *
 * Параметр options.channel сохраняется для обратной совместимости, но
 * НЕ используется для записи в initiator_channel — только для логирования.
 */
class AuditInitiatorHelper {

    /**
     * Извлекает данные инициатора из payload JWT-токена.
     */
    static fromJwt(tokenPayload = {}) {
        if (!tokenPayload || typeof tokenPayload !== 'object') {
            return AuditInitiatorHelper.empty();
        }

        return {
            sub: tokenPayload.preferred_username || tokenPayload.sub || null,
            userId: tokenPayload.sub || null,
            userSessionId: tokenPayload.ctxi || tokenPayload.session_state || null,
            realm: AuditInitiatorHelper.extractRealm(tokenPayload),
            staffId: tokenPayload.preferred_username || tokenPayload.sub || null,
            staffRoleId: AuditInitiatorHelper.extractRole(tokenPayload),
            clientAppId: tokenPayload.client_id || tokenPayload.azp || null,
            channel: tokenPayload.channel || null,
            email: tokenPayload.email || null,
            groups: Array.isArray(tokenPayload.groups) ? tokenPayload.groups : [],
        };
    }

    /**
     * Realm: сначала — поле realm, затем — из iss.
     */
    static extractRealm(tokenPayload = {}) {
        if (tokenPayload.realm) {
            return tokenPayload.realm;
        }
        const iss = tokenPayload.iss;
        if (typeof iss === 'string') {
            const match = iss.match(/\/realms\/([^/]+)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    /**
     * Роль: приоритет — *_lead, иначе — последний сегмент последней группы.
     */
    static extractRole(tokenPayload = {}) {
        const groups = Array.isArray(tokenPayload.groups) ? tokenPayload.groups : [];
        if (!groups.length) {
            return null;
        }

        const leadGroup = groups.find((group) =>
            typeof group === 'string' && group.includes('_lead')
        );
        const targetGroup = leadGroup || groups[groups.length - 1];

        const segments = String(targetGroup).split('/').filter(Boolean);
        return segments.length ? segments[segments.length - 1] : null;
    }

    /**
     * Определяет initiator_channel по иерархии:
     *  - JWT channel
     *  - заголовок x-channel
     *  - process.env.DEFAULT_INITIATOR_CHANNEL
     *  - 'unknown'
     */
    static resolveChannel(jwtData, req) {
        if (jwtData && jwtData.channel) {
            return jwtData.channel;
        }
        if (req && req.headers) {
            const headerChannel = req.headers['x-channel'];
            if (headerChannel && String(headerChannel).trim()) {
                return String(headerChannel).trim();
            }
        }
        if (process.env.DEFAULT_INITIATOR_CHANNEL) {
            return process.env.DEFAULT_INITIATOR_CHANNEL;
        }
        return 'unknown';
    }

    static empty() {
        return {
            sub: null,
            userId: null,
            userSessionId: null,
            realm: null,
            staffId: null,
            staffRoleId: null,
            clientAppId: null,
            channel: null,
            email: null,
            groups: [],
        };
    }

    /**
     * Извлекает payload JWT из объекта пользователя.
     */
    static extractTokenPayload(user = {}) {
        if (!user || typeof user !== 'object') {
            return {};
        }
        if (user.token && typeof user.token === 'object') {
            if (user.token.payload && typeof user.token.payload === 'object') {
                return user.token.payload;
            }
            if (user.token.content && typeof user.token.content === 'object') {
                return user.token.content;
            }
        }
        if (user.tokenPayload && typeof user.tokenPayload === 'object') {
            return user.tokenPayload;
        }
        return {};
    }

    /**
     * IP ближайшего узла (VIP / RemoteAddr).
     */
    static extractNearbyNodeIp(req = {}) {
        if (!req) return null;
        if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
        if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
        return null;
    }

    /**
     * IP инициатора (клиента): X-Forwarded-For → req.ip.
     */
    static extractSourceIp(req = {}) {
        if (!req) return null;
        const forwardedFor = req.headers && req.headers['x-forwarded-for'];
        if (forwardedFor) {
            const firstIp = String(forwardedFor).split(',')[0].trim();
            if (firstIp) return firstIp;
        }
        if (req.ip) return req.ip;
        return null;
    }

    /**
     * URL аудируемой операции.
     */
    static extractContextUrl(req = {}) {
        if (!req) return null;
        if (req.originalUrl) return req.originalUrl;
        if (req.url) return req.url;
        return null;
    }

    /**
     * Полная информация об инициаторе.
     *
     * @param {Object} context - контекст запроса (user, req)
     * @param {Object} [options]
     * @param {string} [options.channel]   - техническая метка (graphql/rest/...)
     *                                       для логирования, в initiator_channel не пишется
     * @param {string} [options.url]       - URL операции (переопределяет req)
     * @param {string} [options.method]    - HTTP-метод (переопределяет req)
     * @param {string} [options.sourceIp]  - IP инициатора
     * @param {string} [options.nearbyNodeIp] - IP ближайшего узла
     * @param {Object} [options.roleModel] - { staffId, staffRoleId } из РМ (приоритет выше JWT)
     */
    static build(context = {}, options = {}) {
        const safeContext = context || {};
        const user = safeContext.user || {};
        const req = safeContext.req || safeContext.request || {};

        const tokenPayload = AuditInitiatorHelper.extractTokenPayload(user);
        const jwtData = AuditInitiatorHelper.fromJwt(tokenPayload);

        const roleModel = options.roleModel || {};

        const url = options.url
            || AuditInitiatorHelper.extractContextUrl(req)
            || null;
        const method = options.method || req.method || null;
        const sourceIp = options.sourceIp
            || AuditInitiatorHelper.extractSourceIp(req)
            || '127.0.0.1';
        const nearbyNodeIp = options.nearbyNodeIp
            || AuditInitiatorHelper.extractNearbyNodeIp(req)
            || null;

        return {
            sub: options.sub
                || user.preferred_username
                || user.username
                || jwtData.sub
                || 'system',
            realm: options.realm
                || user.realm
                || jwtData.realm
                || 'staff',
            channel: AuditInitiatorHelper.resolveChannel(jwtData, req),
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
}

module.exports = AuditInitiatorHelper;