module.exports = {
  poolConfig: {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGSCHEMA,
    idleTimeoutMillis: parseInt(process.env.POOL_QUEUE_TIMEOUT) || 10000,
    max: parseInt(process.env.POOL_MAX) || 50,
    allowExitOnIdle: false,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  retryConfig: {
    retries: parseInt(process.env.ATTEMPT) || 3,
  },
  callTimeout: parseInt(process.env.CALL_TIMEOUT) || 10 * 10000,
};
