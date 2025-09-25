const pg = require("pg");
const { Pool } = require("pg");
const { queryConvert } = require("./utils");
const retry = require("async-retry");
const { get_count, instr } = require("./routines");
const tslgLogger = require('../../../utils/logger');

/**
 * Fix Numeric data type is returned as String
 * Numeric type is OID 1700
 */
pg.types.setTypeParser(1700, (val) => {
  return parseFloat(val);
});

(function (pg) {
  const upperCase = (str) => {
    return str.toUpperCase();
  };

  let queryProto = pg.Query.prototype;
  let orgHandleRowDescription = queryProto.handleRowDescription;
  queryProto.handleRowDescription = function (response) {
    response.fields.forEach((field) => {
      field.name = upperCase(field.name);
    });
    return orgHandleRowDescription.call(this, response);
  };
})(pg);

class PostgresDatabase {
  /**
   * Represents a databse connector.
   *
   * @constructor
   * @param {object} options - The oracle client & pool congif options.
   */
  constructor(options = {}) {
    this.options = {
      poolConfig: {},
      retryConfig: {},
      ...options,
    };
  }

  /**
   * Initializes the database module, creates a connection pool,
   * verifies SSL connectivity, and sets up graceful shutdown.
   */
  async initialize() {
    try {
      tslgLogger.sys("Initializing database module...");

      // Step 1: Create a connection pool using the provided config
      this.pool = new Pool(this.options.poolConfig);
      tslgLogger.sys("Connection pool created successfully.");

      // Step 2: Attach helper routines or middleware
      await this.executeRoutines();
      tslgLogger.sys("Database helper routines initialized.");

      // Step 3: Set up graceful shutdown on SIGINT/SIGTERM
      process
          .once("SIGTERM", () => {
            tslgLogger.sys("SIGTERM received. Closing database pool...");
            this.closePool();
          })
          .once("SIGINT", () => {
            tslgLogger.sys("SIGINT received. Closing database pool...");
            this.closePool();
          });

      // Step 4: Test connection and verify SSL is working
      const client = await this.pool.connect();

      try {
        // Get SSL connection info
        const sslCheck = await client.query(
          "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid();"
        );

        // Determine if SSL is used
        const sslValue = sslCheck.rows[0]?.["ssl"] || sslCheck.rows[0]?.["SSL"];
        const isSSLUsed = sslValue === "t" || sslValue === true;

        tslgLogger.info(`SSL connection in use: ${isSSLUsed ? "✅ Yes" : "❌ No"}`, 'ПроверкаSSL');
      } finally {
        client.release();
      }
    } catch (err) {
      tslgLogger.error("Failed to initialize database module", 'ОшибкаИнициализацииБД', err);
      throw err;
    }
  }

  /**
   * Close default pool after use.
   *
   * @public
   */
  async closePool() {
    try {
      tslgLogger.sys("Closing database connection pool");
      await this.pool.end();
      tslgLogger.sys("Database connection successfully closed");
    } catch (err) {
      tslgLogger.error("Error closing database pool", 'ОшибкаЗакрытияБД', err);
    }
  }

  /**
   * Get new connection from pool.
   *
   * @public
   */
  async getConnection() {
    try {
      const { callTimeout } = this.options;
      const connection = await this.pool.connect();

      if (!connection) {
        throw new Error("Unable to get connection from pool");
      }

      if (callTimeout) {
        connection.callTimeout = callTimeout;
      }

      return connection;
    } catch (err) {
      tslgLogger.error("Error getting database connection", 'ОшибкаСоединенияБД', err);
      throw err;
    }
  }

  /**
   * Execute query.
   *
   * @public
   * @param {string} sql - SQL query string.
   * @param {object} args - Query arguments.
   */
  async execute({ sql, args = {} }) {
    const connection = await this.getConnection();

    try {
      return await retry((_, attempt) => {
        if (attempt && attempt > 1) {
          tslgLogger.warn(`Attempting to process "query" command again`, 'ПовторЗапросаБД', {
            attempt,
            sql: sql.substring(0, 100) + '...'
          });
        }

        return connection.query(queryConvert(sql, args));
      }, this.options.retryConfig);
    } catch (err) {
      tslgLogger.error(`Unable to process SQL query`, 'ОшибкаЗапросаБД', err, {
        sql: sql.substring(0, 200) + '...',
        args: JSON.stringify(args).substring(0, 200) + '...'
      });
      throw err;
    } finally {
      try {
        await connection.release();
      } catch (err) {
        tslgLogger.error("Error releasing database connection", 'ОшибкаОсвобожденияБД', err);
      }
    }
  }

  // Метод возвращает соединение, с которым необходимо далее работать через метод executeWithConnection, так как транзакция работает только в рамках одного соединения
  // см. https://node-postgres.com/features/transactions
  // После выполнения бизнес-логики необходимо выполнить commitTransaction или rollbackTransaction
  async beginTransation() {
    const connection = await this.getConnection();
    await connection.query("BEGIN");

    return connection;
  }

  async commitTransaction(connection) {
    try {
      await connection.query("COMMIT");
      await connection.release();
    } catch (err) {
      tslgLogger.error("Error committing transaction", 'ОшибкаКоммитаБД', err);
      throw err;
    }
  }

  async rollbackTransaction(connection) {
    try {
      await connection.query("ROLLBACK");
      await connection.release();
    } catch (err) {
      tslgLogger.error("Error rolling back transaction", 'ОшибкаОткатаБД', err);
      throw err;
    }
  }

  async executeWithConnection({ connection, sql, args = {} }) {
    try {
      return await retry((_, attempt) => {
        if (attempt && attempt > 1) {
          tslgLogger.warn(`Attempting to process "query" command again`, 'ПовторЗапросаБД', {
            attempt,
            sql: sql.substring(0, 100) + '...'
          });
        }

        return connection.query(queryConvert(sql, args));
      }, this.options.retryConfig);
    } catch (err) {
      tslgLogger.error(`Unable to process SQL query with connection`, 'ОшибкаЗапросаБД', err, {
        sql: sql.substring(0, 200) + '...',
        args: JSON.stringify(args).substring(0, 200) + '...'
      });
      throw err;
    }
  }

  /**
   * Execute many queries.
   *
   * @public
   * @param {string} sql - SQL query string.
   * @param {array} args - Query arguments.
   */
  async executeMany({ sql, args }) {
    return Promise.all(args.map((arg) => this.execute({ sql, args: arg })));
  }

  async executeRoutines() {
    await this.execute({
      sql: get_count,
    });

    await this.execute({
      sql: instr,
    });

    return;
  }
}

module.exports = PostgresDatabase;
