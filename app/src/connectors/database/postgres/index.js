const pg = require('pg')
const { Pool } = require('pg')
const { queryConvert } = require('./utils')
const retry = require('async-retry')
const { get_count, instr } = require('./routines')

/**
 * Fix Numeric data type is returned as String
 * Numeric type is OID 1700
 */
pg.types.setTypeParser(1700, (val) => {
    return parseFloat(val)
});

;(function (pg) {
    const upperCase = (str) => {
        return str.toUpperCase()
    }

    let queryProto = pg.Query.prototype
    let orgHandleRowDescription = queryProto.handleRowDescription
    queryProto.handleRowDescription = function (response) {
        response.fields.forEach(field => {
            field.name = upperCase(field.name)
        })
        return orgHandleRowDescription.call(this, response)
    }
})(pg)

class PostgresDatabase {
    /**
     * Represents a databse connector.
     *
     * @constructor
     * @param {object} options - The oracle client & pool congif options.
     */
    constructor (options = {}) {
        this.options = {
            poolConfig: {},
            retryConfig: {},
            ...options
        }
    }

    /**
     * Initialize oracle client and default connection pool.
     *
     * @public
     */
    async initialize () {
        try {
            console.sys('Initializing database module')

            // Create a connection pool
            this.pool = new Pool(this.options.poolConfig)

            // Add helper function for sql requests
            await this.executeRoutines()

            console.sys('Database connection pool successfully created')

            // Subscribe on SIGTERM & SIGINT to terminate pool gracefully
            process
                .once('SIGTERM', () => {
                    this.closePool();
                })
                .once('SIGINT', () => {
                    this.closePool();
                })
        } catch (err) {
            console.error(err)
            throw err
        }
    }

    /**
     * Close default pool after use.
     *
     * @public
     */
    async closePool () {
        try {
            console.sys('Closing database connection pool')
            await this.pool.end()
            console.sys('Database connection successfully closed')
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * Get new connection from pool.
     *
     * @public
     */
    async getConnection () {
        try {
            const { callTimeout } = this.options
            const connection = await this.pool.connect()

            if (!connection) {
                throw new Error('Unable to get connection from pool')
            }

            if (callTimeout) {
                connection.callTimeout = callTimeout
            }

            return connection
        } catch (err) {
            console.error(err)
            throw err
        }
    }

    /**
     * Execute query.
     *
     * @public
     * @param {string} sql - SQL query string.
     * @param {object} args - Query arguments.
     */
    async execute ({ sql, args= {} }) {
        const connection = await this.getConnection()

        try {
            return await retry((_, attempt) => {
                if (attempt && attempt > 1) {
                    console.warn(`Attempting to process "query" command again`)
                }

                return connection.query(queryConvert(sql, args))
            }, this.options.retryConfig)
        } catch (err) {
            console.error(err)
            console.log(`Unable to process SQL query:`, sql)
            console.log('With query arguments:', args)
            throw err
        } finally {
            try {
                await connection.release()
            } catch (err) {
                console.error(err)
            }
        }
    }

    /**
     * Execute many queries.
     *
     * @public
     * @param {string} sql - SQL query string.
     * @param {array} args - Query arguments.
     */
    async executeMany ({ sql, args }) {
        return Promise.all(
          args.map(arg => this.execute({ sql, args: arg }))
        )
    }

    async executeRoutines() {
        await this.execute({
            sql: get_count
        })

        await this.execute({
            sql: instr
        })

        return
    }
}

module.exports = PostgresDatabase
