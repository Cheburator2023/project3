const fetch = require('isomorphic-fetch');
const tslgLogger = require('../logger');

/**
 * Кэширующий клиент ролевой модели (РМ) для получения subjectCode (staff_id)
 * и roleCode (staff_roleId) по sub пользователя.
 *
 * Включается переменной окружения ROLE_MODEL_ENABLED=true и требует
 * ROLE_MODEL_API_URL. При выключенном флаге или ошибках возвращает null —
 * вызывающий код использует fallback (JWT).
 *
 * Соответствует HELP.md, раздел «Интеграция с ролевой моделью»:
 * TsrmStaffIdResolver → subjectCode, TsrmRoleResolver → roleCode.
 */
class RoleModelClient {
    constructor() {
        this.enabled = process.env.ROLE_MODEL_ENABLED === 'true';
        this.baseUrl = process.env.ROLE_MODEL_API_URL || '';
        this.ttlMs = parseInt(process.env.ROLE_MODEL_CACHE_TTL_MS, 10) || 5 * 60 * 1000;
        this.timeoutMs = parseInt(process.env.ROLE_MODEL_TIMEOUT_MS, 10) || 2000;
        this.cache = new Map();
    }

    /**
     * Возвращает { staffId, staffRoleId } по sub.
     * При ошибке/отсутствии данных — { staffId: null, staffRoleId: null }.
     *
     * @param {string} sub
     * @param {string} [token]
     */
    async resolve(sub, token = null) {
        if (!this.enabled || !this.baseUrl || !sub) {
            return { staffId: null, staffRoleId: null };
        }

        const cached = this.cache.get(sub);
        if (cached && cached.expiresAt > Date.now()) {
            return { staffId: cached.staffId, staffRoleId: cached.staffRoleId };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}/users/${encodeURIComponent(sub)}/attributes`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                signal: controller.signal,
            });

            if (!response.ok) {
                tslgLogger.warn(
                    `[RoleModelClient] RM responded with ${response.status} for sub=${sub}`,
                    'RoleModelClient'
                );
                return { staffId: null, staffRoleId: null };
            }

            const data = await response.json();
            const staffId = data.subjectCode || data.subject_code || null;
            const staffRoleId = data.roleCode || data.role_code || null;

            this.cache.set(sub, {
                staffId,
                staffRoleId,
                expiresAt: Date.now() + this.ttlMs,
            });

            return { staffId, staffRoleId };
        } catch (err) {
            tslgLogger.warn(
                `[RoleModelClient] Failed to resolve RM attributes for sub=${sub}: ${err.message}`,
                'RoleModelClient'
            );
            return { staffId: null, staffRoleId: null };
        } finally {
            clearTimeout(timeout);
        }
    }
}

module.exports = new RoleModelClient();