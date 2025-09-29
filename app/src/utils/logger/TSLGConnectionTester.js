const dns = require('dns');
const net = require('net');

/**
 * Тестер подключения к TSLG агенту
 */
class TSLGConnectionTester {
    constructor(config) {
        this.config = config;
        this.lastTestTime = 0;
        this.cacheTTL = 30000;
        this.hostStatus = null;
    }

    async testConnection() {
        const now = Date.now();
        if (this.hostStatus && (now - this.lastTestTime) < this.cacheTTL) {
            return this.hostStatus;
        }

        try {
            await this.testDNS();
            const isReachable = await this.testTCP();

            this.hostStatus = {
                dnsResolved: true,
                tcpReachable: isReachable,
                lastTest: now
            };

        } catch (error) {
            this.hostStatus = {
                dnsResolved: false,
                tcpReachable: false,
                lastTest: now,
                error: error.message
            };
        }

        this.lastTestTime = now;
        return this.hostStatus;
    }

    testDNS() {
        return new Promise((resolve, reject) => {
            dns.lookup(this.config.host, (err, address) => {
                if (err) {
                    reject(new Error(`DNS resolution failed for ${this.config.host}: ${err.message}`));
                } else {
                    resolve(address);
                }
            });
        });
    }

    testTCP() {
        return new Promise((resolve) => {
            const socket = net.createConnection({
                host: this.config.host,
                port: this.config.port,
                timeout: 5000
            });

            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, 5000);

            socket.on('connect', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(true);
            });

            socket.on('error', () => {
                clearTimeout(timeout);
                resolve(false);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
        });
    }

    async isTSLGAvailable() {
        const status = await this.testConnection();
        return status.tcpReachable;
    }

    getStatus() {
        return this.hostStatus;
    }
}

module.exports = TSLGConnectionTester;