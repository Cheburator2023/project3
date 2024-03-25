const PostgresDatabase = require('./postgres');
const config = require('./postgres/config');
const defaultThreadPoolSize = 4;

// Increase thread pool size by max
if(config.poolConfig?.max) {
    process.env.UV_THREADPOOL_SIZE = config.poolConfig.max + defaultThreadPoolSize;
} else {
    console.warn(`Unable to set UV_THREADPOOL_SIZE due to poolMax variable is unavailable. Continue with default UV_THREADPOOL_SIZE=${defaultThreadPoolSize}.`);
}

// Create DB instance
const db = new PostgresDatabase(config);

module.exports = db;
