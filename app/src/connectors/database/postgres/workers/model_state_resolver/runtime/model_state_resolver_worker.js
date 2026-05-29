/**
 * Фоновый воркер пересчёта итоговых таблиц `model_stage` и `model_status`.
 *
 * Общая модель работы:
 * - читает задачи из `model_recalc_queue`;
 * - берёт в обработку только одну модель за транзакцию;
 * - вызывает переданный callback `recomputeResolved`;
 * - при успехе удаляет запись из очереди;
 * - при ошибке увеличивает `attempts`, пишет `last_error` и планирует повтор.
 *
 * Воркер поддерживает два механизма пробуждения:
 * - `LISTEN/NOTIFY` по каналу Postgres;
 * - периодический polling очереди как fallback.
 */
class ModelStateResolverWorker {
  /**
   * @param {object} db Инстанс PostgresDatabase.
   * @param {Function} recomputeResolved Функция полного пересчёта одной модели.
   * @param {object} [opts]
   * @param {number} [opts.pollMs=1000] Интервал polling в миллисекундах.
   * @param {number} [opts.maxAttempts=10] Максимальное число попыток пересчёта одной модели.
   * @param {string} [opts.channel='model_recalc'] Канал Postgres для LISTEN/NOTIFY.
   * @param {boolean} [opts.useListen=true] Включать ли LISTEN/NOTIFY.
   * @param {object} [opts.logger=console] Логгер с методами info/warn/error.
   */
  constructor (db, recomputeResolved, opts = {}) {
    this.db = db
    this.recomputeResolved = recomputeResolved

    this.pollMs = opts.pollMs ?? 1000
    this.maxAttempts = opts.maxAttempts ?? 10
    this.channel = opts.channel ?? 'model_recalc'
    this.useListen = opts.useListen ?? true
    this.logger = opts.logger ?? console

    this.running = false
    this.wake = false
    this.listenConn = null
    this.loopPromise = null
    this.listenerRestartPromise = null
  }

  /**
   * Запускает воркер.
   *
   * Если LISTEN включён, сначала поднимается отдельное соединение на канал,
   * затем стартует бесконечный цикл обработки очереди.
   */
  async start () {
    if (this.running) return

    this.running = true

    try {
      if (this.useListen) {
        await this.startListener()
      }

      this.loopPromise = this.loop()
      this.loopPromise.catch((error) => {
        this.logger.error('[ModelStateResolverWorker] loop crashed', error)
      })
    } catch (error) {
      this.running = false
      throw error
    }
  }

  /**
   * Останавливает воркер.
   *
   * Порядок остановки:
   * - ставит флаг завершения цикла;
   * - закрывает LISTEN-соединение;
   * - дожидается завершения основного loop.
   */
  async stop () {
    if (!this.running && !this.listenConn && !this.loopPromise) return

    this.running = false
    this.wake = true

    await this.stopListener()

    if (this.loopPromise) {
      try {
        await this.loopPromise
      } finally {
        this.loopPromise = null
      }
    }
  }

  /**
   * Открывает отдельное соединение к БД и подписывается на канал `LISTEN`.
   * При получении notification воркер просыпается и сразу перечитывает очередь.
   */
  async startListener () {
    this.listenConn = await this.db.getConnection()

    await this.listenConn.query(`LISTEN ${ this.channel }`)

    this.listenConn.on('notification', () => {
      this.wake = true
    })

    this.listenConn.on('error', (error) => {
      this.logger.warn('[ModelStateResolverWorker] LISTEN connection error', error)
      this.wake = true
      this.restartListener('connection error').catch((restartError) => {
        this.logger.error('[ModelStateResolverWorker] LISTEN restart failed', restartError)
      })
    })

    this.logger.info(`[ModelStateResolverWorker] LISTEN ${ this.channel } enabled`)
  }

  /**
   * Переоткрывает LISTEN-соединение после ошибки.
   *
   * Метод защищён от параллельных перезапусков через `listenerRestartPromise`.
   *
   * @param {string} reason Человекочитаемая причина рестарта.
   */
  async restartListener (reason) {
    if (!this.running || !this.useListen) return
    if (this.listenerRestartPromise) return this.listenerRestartPromise

    this.listenerRestartPromise = (async () => {
      this.logger.warn(`[ModelStateResolverWorker] restarting LISTEN connection: ${ reason }`)
      await this.stopListener()

      if (!this.running) return

      await this.startListener()
    })()

    try {
      await this.listenerRestartPromise
    } finally {
      this.listenerRestartPromise = null
    }
  }

  /**
   * Снимает подписку LISTEN и освобождает выделенное соединение.
   */
  async stopListener () {
    if (!this.listenConn) return

    const connection = this.listenConn
    this.listenConn = null

    connection.removeAllListeners('notification')
    connection.removeAllListeners('error')

    try {
      await connection.query(`UNLISTEN ${ this.channel }`)
    } catch {
    }

    try {
      await connection.release()
    } catch {
    }
  }

  /**
   * Основной цикл обработки.
   *
   * Пока воркер запущен:
   * - пытается обработать все доступные записи в очереди;
   * - если работы больше нет, ждёт либо notification, либо `pollMs`.
   */
  async loop () {
    this.logger.info('[ModelStateResolverWorker] started')

    while (this.running) {
      try {
        let processed
        do {
          processed = await this.processOneModelTx()
        } while (this.running && processed > 0)
      } catch (error) {
        this.logger.error('[ModelStateResolverWorker] loop error', error)
      }

      if (!this.running) break

      if (this.wake) {
        this.wake = false
        continue
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollMs))
    }

    this.logger.info('[ModelStateResolverWorker] stopped')
  }

  /**
   * Обрабатывает одну запись очереди в рамках одной транзакции.
   *
   * Возвращает:
   * - `1`, если модель была взята и обработана;
   * - `0`, если доступных записей нет.
   */
  async processOneModelTx () {
    const connection = await this.db.beginTransation()

    try {
      const job = await this.takeOne(connection)

      if (!job) {
        await this.db.commitTransaction(connection)
        return 0
      }

      try {
        await this.recomputeResolved(job, { connection })
        await this.db.executeWithConnection({
          connection,
          sql: 'delete from model_recalc_queue where model_id = :model_id',
          args: { model_id: job.modelId }
        })

        this.logger.info(`[ModelStateResolverWorker] recompute succeeded for model_id=${ job.modelId }`)
      } catch (error) {
        this.logger.error(`[ModelStateResolverWorker] recompute failed for model_id=${ job.modelId }`, error)
        await this.onError(connection, job.modelId, String(error?.message || error))
      }

      await this.db.commitTransaction(connection)
      return 1
    } catch (error) {
      await this.db.rollbackTransaction(connection)
      throw error
    }
  }

  /**
   * Выбирает одну запись из очереди с учётом:
   * - лимита `maxAttempts`;
   * - backoff через `next_attempt_at`;
   * - конкурентной обработки через `FOR UPDATE SKIP LOCKED`.
   *
   * @param {object} connection Активное транзакционное соединение.
   * @returns {Promise<null|{modelId:string,sources:string[],lastEvent:object|null}>}
   */
  async takeOne (connection) {
    const res = await this.db.executeWithConnection({
      connection,
      sql: `
        select model_id, sources, last_event
        from model_recalc_queue
        where attempts < :max_attempts
          and (next_attempt_at is null or next_attempt_at <= now())
        order by updated_at
        for update skip locked
        limit 1
      `,
      args: {
        max_attempts: this.maxAttempts
      }
    })

    const row = res.rows?.[0]
    if (!row) return null

    return {
      modelId: row.MODEL_ID,
      sources: row.SOURCES ?? [],
      lastEvent: row.LAST_EVENT ?? null
    }
  }

  /**
   * Обновляет запись очереди после ошибки пересчёта.
   *
   * Поведение:
   * - увеличивает `attempts`;
   * - пишет текст ошибки и время ошибки;
   * - рассчитывает `next_attempt_at`;
   * - если достигнут `maxAttempts`, переводит запись в терминальное состояние,
   *   в котором она остаётся в очереди, но больше не будет автоматически подбираться.
   *
   * @param {object} connection Активное транзакционное соединение.
   * @param {string} modelId Идентификатор модели.
   * @param {string} errMsg Текст ошибки.
   */
  async onError (connection, modelId, errMsg) {
    await this.db.executeWithConnection({
      connection,
      sql: `
        update model_recalc_queue
        set
          attempts = attempts + 1,
          last_error = :err,
          last_error_at = now(),
          next_attempt_at = case
            when attempts + 1 >= :max_attempts then null
            else now()
              + make_interval(secs => least(60, power(2, least(attempts, 10))::int))
          end
        where model_id = :model_id
      `,
      args: {
        model_id: modelId,
        err: errMsg,
        max_attempts: this.maxAttempts
      }
    })

    const state = await this.db.executeWithConnection({
      connection,
      sql: `
        select attempts
        from model_recalc_queue
        where model_id = :model_id
      `,
      args: { model_id: modelId }
    })

    const attempts = state.rows?.[0]?.ATTEMPTS ?? 0

    if (attempts >= this.maxAttempts) {
      this.logger.error(`[ModelStateResolverWorker] reached maxAttempts=${ this.maxAttempts } for model_id=${ modelId }`)
      return
    }

    this.logger.warn(`[ModelStateResolverWorker] scheduled retry for model_id=${ modelId }`)
  }
}

module.exports = ModelStateResolverWorker
