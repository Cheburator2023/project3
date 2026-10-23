const { KNOWN_ROLES } = require('./auditConstants');

/**
 * Хелпер для извлечения данных из JWT-токена.
 */
class JwtHelper {
    /**
     * Извлекает данные инициатора из payload JWT-токена.
     */
    static fromJwt(tokenPayload = {}) {
        if (!tokenPayload || typeof tokenPayload !== 'object') {
            return JwtHelper.empty();
        }

        return {
            sub: tokenPayload.preferred_username || tokenPayload.sub || null,
            userId: tokenPayload.sub || null,
            userSessionId: tokenPayload.ctxi || tokenPayload.session_state || null,
            realm: JwtHelper.extractRealm(tokenPayload),
            staffId: tokenPayload.preferred_username || tokenPayload.sub || null,
            staffRoleId: JwtHelper.extractRole(tokenPayload),
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
     */
    static extractRole(tokenPayload = {}) {
        const groups = Array.isArray(tokenPayload.groups) ? tokenPayload.groups : [];
        if (!groups.length) {
            return null;
        }

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

        const leadRole = normalized.find((role) => role.endsWith('_lead'));
        if (leadRole) {
            return leadRole;
        }

        const knownRole = normalized.find((role) => KNOWN_ROLES.has(role));
        if (knownRole) {
            return knownRole;
        }

        const roleLike = normalized.find((role) => /^[a-z][a-z0-9_]{1,50}$/i.test(role));
        if (roleLike) {
            return roleLike;
        }

        return normalized[normalized.length - 1];
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
}

module.exports = JwtHelper;