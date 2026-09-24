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

/**
 * Известные роли ролевой модели СУМ.
 * Используются как приоритетный источник staff_roleId при отсутствии
 * корректных данных из РМ. Составлено по HELP.md (раздел «Интеграция с
 * ролевой моделью») и фактическому реестру ролей Keycloak СУМ.
 */
const KNOWN_ROLES = new Set([
    // Управление моделями / DS
    'ds',
    'ds_lead',
    'ds_editor',
    'de',
    'de_lead',
    'mipm',
    'mipm_lead',
    'modelops',
    'modelops_lead',
    // Валидация
    'validator',
    'validator_lead',
    // Бизнес-заказчик
    'business_customer',
    // Аудит / безопасность
    'auditor',
    'auditor_lead',
    'audit_admin',
    // Системные
    'admin',
    'staff',
    'trust',
]);

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
     * Разрешает staff_roleId из списка групп JWT.
     *
     * Приоритеты:
     *   1. Группа с суффиксом '_lead' (например, 'ds_lead', 'validator_lead').
     *   2. Группа из KNOWN_ROLES (например, 'validator', 'ds_editor').
     *   3. Первая группа, соответствующая шаблону кода роли (латиница,
     *      цифры, '_', без пробелов).
     *   4. Fallback: последний сегмент последней группы.
     *
     * Это позволяет корректно обрабатывать продакшен-роли без '_lead'
     * ('validator', 'ds_editor', 'auditor', 'modelops' и т.д.), а также
     * отфильтровывать департаментские пути вида
     * '/departament/Управление моделирования'.
     *
     * @param {Object} tokenPayload - payload JWT-токена
     * @returns {string|null} - код роли или null
     */
    static extractRole(tokenPayload = {}) {
        const groups = Array.isArray(tokenPayload.groups) ? tokenPayload.groups : [];
        if (!groups.length) {
            return null;
        }

        // Нормализуем группы: берём последний сегмент пути, отбрасываем пустые.
        const normalized = groups
            .map((group) => {
                if (typeof group !== 'string') {
                    return null;
                }
                const segments = group.split('/').filter(Boolean);
                return segments.length ? segments[segments.length - 1] : null;
            })
            .filter(Boolean);

        if (!normalized.length) {
            return null;
        }

        // Приоритет 1: роль с суффиксом '_lead'.
        const leadRole = normalized.find((role) => role.endsWith('_lead'));
        if (leadRole) {
            return leadRole;
        }

        // Приоритет 2: известная роль из KNOWN_ROLES.
        const knownRole = normalized.find((role) => KNOWN_ROLES.has(role));
        if (knownRole) {
            return knownRole;
        }

        // Приоритет 3: первая группа, соответствующая шаблону кода роли.
        // Отсеивает кириллические департаменты и прочие свободные значения.
        const roleLike = normalized.find((role) => /^[a-z][a-z0-9_]{1,50}$/i.test(role));
        if (roleLike) {
            return roleLike;
        }

        // Приоритет 4: последний сегмент последней группы.
        return normalized[normalized.length - 1];
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