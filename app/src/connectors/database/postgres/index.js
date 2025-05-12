const pg = require("pg");
const { Pool } = require("pg");
const { queryConvert } = require("./utils");
const retry = require("async-retry");
const { get_count, instr } = require("./routines");

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
      console.sys("Initializing database module...");

      // Step 1: Create a connection pool using the provided config
      this.pool = new Pool(this.options.poolConfig);
      console.sys("Connection pool created successfully.");

      // Step 2: Attach helper routines or middleware (e.g. custom query wrappers)
      await this.executeRoutines();
      console.sys("Database helper routines initialized.");

      // Step 3: Set up graceful shutdown on SIGINT/SIGTERM
      process
        .once("SIGTERM", () => {
          console.sys("SIGTERM received. Closing database pool...");
          this.closePool();
        })
        .once("SIGINT", () => {
          console.sys("SIGINT received. Closing database pool...");
          this.closePool();
        });

      // Step 4: Test connection and verify SSL is working
      const client = await this.pool.connect();

      try {
        // Query to check PostgreSQL version
        const result = await client.query("SELECT version() AS version;");

        // Log success and version info
        console.sys("Successfully connected to PostgreSQL over SSL.");
        console.log("PostgreSQL version:", result.rows[0].version); // Access by alias "version"
      } finally {
        client.release(); // Always release the client back to the pool
      }
    } catch (err) {
      // Catch any initialization errors
      console.error(
        "Failed to initialize database module:",
        err.message || err
      );
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
      console.sys("Closing database connection pool");
      await this.pool.end();
      console.sys("Database connection successfully closed");
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
          console.warn(`Attempting to process "query" command again`);
        }

        return connection.query(queryConvert(sql, args));
      }, this.options.retryConfig);
    } catch (err) {
      console.error(err);
      console.log(`Unable to process SQL query:`, sql);
      console.log("With query arguments:", args);
      throw err;
    } finally {
      try {
        await connection.release();
      } catch (err) {
        console.error(err);
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
    await connection.query("COMMIT");
    await connection.release();
  }

  async rollbackTransaction(connection) {
    await connection.query("ROLLBACK");
    await connection.release();
  }

  async executeWithConnection({ connection, sql, args = {} }) {
    try {
      return await retry((_, attempt) => {
        if (attempt && attempt > 1) {
          console.warn(`Attempting to process "query" command again`);
        }

        return connection.query(queryConvert(sql, args));
      }, this.options.retryConfig);
    } catch (err) {
      console.error(err);
      console.log(`Unable to process SQL query:`, sql);
      console.log("With query arguments:", args);
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
