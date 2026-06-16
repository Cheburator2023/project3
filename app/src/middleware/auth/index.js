const session = require('express-session');
const Keycloak = require('keycloak-connect');
const auditClient = require('../../utils/audit/auditClient');
const tslgLogger = require('../../utils/logger');


const config = {
    realm: process.env.KEYCLOAK_REALMS,
    'auth-server-url': `${process.env.KEYCLOAK_URL}auth`,
    'ssl-required': 'none',
    resource: process.env.KEYCLOAK_CLIENT,
    'bearer-only': true,
};

function consoleDebug(...args) {
    const consoleToUse = console.original?.log || console.log;
    consoleToUse('[DEBUG}', ...args);
}

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, config);
const session_params = {
    store: memoryStore,
    secret: process.env.SECRET || 'thisShouldBeLongAndSecret',
    resave: false,
    saveUninitialized: true,
};

// Кэш отправленных аудитов по jti токена (для предотвращения дублей)
const sentAuditCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 минут (среднее время жизни токена)

// Периодическая очистка устаревших записей
setInterval(() => {
    const now = Date.now();
    for (const [jti, timestamp] of sentAuditCache.entries()) {
        if (now - timestamp > CACHE_TTL_MS) {
            sentAuditCache.delete(jti);
        }
    }
}, 60000); // Раз в минуту

module.exports = {
    keycloak,
    sessionMiddleware: () => session(session_params),
    authMiddleware: async (req, res, next) => {
        // Извлечение данных из токена (предоставляется Keycloak middleware)
        const { content: context, token } = req.kauth.grant.access_token;

        if (!req.context) {
            req.context = {};
        }

        // Формирование объекта пользователя (существующая логика)
        req.context.user = {
            id: context.sub || null,
            session: context.session_state,
            name: context.preferred_username,
            username: context.preferred_username,
            email: context.email,
            camundaID: `${context.preferred_username} (${context.email})`,
            keycloakGroups: context.groups,
            family_name: context.family_name || '',
            given_name: context.given_name || '',
            preferred_username: context.preferred_username,
            groups: context.groups
                .reduce((prev, group) => {
                    const newGroup = group.split('/');
                    prev.push(...newGroup);
                    return prev;
                }, [])
                .filter((d) => d)
                .filter((d, i, a) => a.indexOf(d) === i && d),
            roles: context.roles || [],
            token,
        };

        // Отправка аудита аутентификации (SUMD_AUTH) – один раз за токен
        const jti = token?.payload?.jti || context.jti;
        if (jti && !sentAuditCache.has(jti)) {
            // Помечаем токен как обработанный
            sentAuditCache.set(jti, Date.now());

            // Формирование информации об инициаторе
            const initiatorInfo = {
                sub: req.context.user.preferred_username || req.context.user.username || 'system',
                realm: context.realm || 'staff',
                channel: 'http',
                url: req.url,
                method: req.method,
                sourceIp: req.ip || '127.0.0.1'
            };

            let correlationId;
            try {
                correlationId = await auditClient.start(
                    'SUMD_AUTH',
                    initiatorInfo,
                    { username: req.context.user.username }
                );
                await auditClient.success(
                    'SUMD_AUTH',
                    correlationId,
                    initiatorInfo,
                    { username: req.context.user.username }
                );
            } catch (error) {
                // Ошибка аудита не должна блокировать основной запрос
                if (process.env.NODE_ENV !== 'production') {
                    consoleDebug(`Ошибка отправки сообщения в Аудит: ${error.msg}`, {
                        system: 'AUDIT',
                        error: error.message
                    });
                }
            }
        }

        next();
    },
};
