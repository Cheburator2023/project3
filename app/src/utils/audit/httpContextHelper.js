/**
 * Хелпер для извлечения данных из HTTP-запроса (контекста).
 */
class HttpContextHelper {
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
}

module.exports = HttpContextHelper;