const ModelStateResolverWorker = require('./model_state_resolver_worker')

const OPEN_INTERVAL = '9999-12-31 23:59:59'

/**
 * Создаёт инстанс `ModelStateResolverWorker` и привязывает к нему доменную логику пересчёта.
 *
 * `recomputeResolved` внутри фабрики реализует полный пересчёт одной модели:
 * - читает source и override записи;
 * - применяет правила замены по `source_record_id`;
 * - при необходимости закрывает незаблокированные status override;
 * - валидирует override значения;
 * - собирает новые final-строки;
 * - сохраняет построчный `last_event`;
 * - полностью заменяет итоговые строки модели в `model_stage` и `model_status`.
 *
 * @param {object} database Инстанс PostgresDatabase.
 * @param {object} [opts]
 * @param {Function} [opts.stageValidator] Опциональная функция валидации stage override.
 * @param {Function} [opts.statusValidator] Опциональная функция валидации status override.
 * @param {string[]} [opts.validStages] Альтернативный способ задать whitelist для stage.
 * @param {string[]} [opts.validStatuses] Альтернативный способ задать whitelist для status.
 * @returns {ModelStateResolverWorker}
 */
function createModelStateResolverWorker (database, opts = {}) {
  if (!database) {
    throw new Error('createModelStateResolverWorker: database is required')
  }

  async function recomputeResolved (job, { connection }) {
    const modelId = job.modelId
    const dbNow = await selectCurrentTimestamp(database, connection)
    const jobLastEvent = normalizeLastEvent(job.lastEvent, { modelId, fallbackAt: dbNow })

    const validators = createValidators(opts)

    const stageSources = await selectRows(database, connection, `
      select id, model_id, stage, effective_from, effective_to, source_system
      from model_stage_source
      where model_id = :model_id
      order by id
    `, { model_id: modelId })

    const stageOverrides = await selectRows(database, connection, `
      select id, model_id, source_record_id, stage, effective_from, effective_to, correction_reason, is_final_override, author
      from model_stage_override
      where model_id = :model_id
      order by id
    `, { model_id: modelId })

    const statusSources = await selectRows(database, connection, `
      select id, model_id, status, effective_from, effective_to, source_system
      from model_status_source
      where model_id = :model_id
      order by id
    `, { model_id: modelId })

    const statusOverridesBeforeClose = await selectRows(database, connection, `
      select id, model_id, source_record_id, status, effective_from, effective_to, correction_reason, is_final_override, author
      from model_status_override
      where model_id = :model_id
      order by id
    `, { model_id: modelId })

    await closeNonFinalStatusOverrides({
      database,
      connection,
      modelId,
      sourceRows: statusSources,
      overrideRows: statusOverridesBeforeClose,
      triggerEvent: jobLastEvent
    })

    const statusOverrides = await selectRows(database, connection, `
      select id, model_id, source_record_id, status, effective_from, effective_to, correction_reason, is_final_override, author
      from model_status_override
      where model_id = :model_id
      order by id
    `, { model_id: modelId })

    validateOverrideRows({
      entityName: 'stage',
      overrideRows: stageOverrides,
      modelId,
      validator: validators.stage
    })

    validateOverrideRows({
      entityName: 'status',
      overrideRows: statusOverrides,
      modelId,
      validator: validators.status
    })

    const previousStageRows = await selectRows(database, connection, `
      select model_id, stage, effective_from, effective_to, source_record_id, override_record_id, source_table, calculated_at, last_event
      from model_stage
      where model_id = :model_id
    `, { model_id: modelId })

    const previousStatusRows = await selectRows(database, connection, `
      select model_id, status, effective_from, effective_to, source_record_id, override_record_id, source_table, calculated_at, last_event
      from model_status
      where model_id = :model_id
    `, { model_id: modelId })

    const stageRows = resolveRows({
      entityName: 'stage',
      modelId,
      sourceRows: stageSources,
      overrideRows: stageOverrides,
      finalSourceTable: 'model_stage_override'
    })

    const statusRows = resolveRows({
      entityName: 'status',
      modelId,
      sourceRows: statusSources,
      overrideRows: statusOverrides,
      finalSourceTable: 'model_status_override'
    })

    validateSingleActiveStatus(statusRows, modelId)

    const finalStageRows = attachMetadata({
      rows: stageRows,
      entityName: 'stage',
      previousRows: previousStageRows,
      calculatedAt: dbNow,
      jobLastEvent
    })

    const finalStatusRows = attachMetadata({
      rows: statusRows,
      entityName: 'status',
      previousRows: previousStatusRows,
      calculatedAt: dbNow,
      jobLastEvent
    })

    await database.executeWithConnection({
      connection,
      sql: 'delete from model_stage where model_id = :model_id',
      args: { model_id: modelId }
    })

    await database.executeWithConnection({
      connection,
      sql: 'delete from model_status where model_id = :model_id',
      args: { model_id: modelId }
    })

    for (const row of finalStageRows) {
      await database.executeWithConnection({
        connection,
        sql: `
          insert into model_stage (
            model_id,
            stage,
            effective_from,
            effective_to,
            source_record_id,
            override_record_id,
            source_table,
            calculated_at,
            last_event
          ) values (
            :model_id,
            :stage,
            :effective_from,
            :effective_to,
            :source_record_id,
            :override_record_id,
            :source_table,
            current_timestamp(0),
            :last_event::jsonb
          )
        `,
        args: toStageInsertArgs(row)
      })
    }

    for (const row of finalStatusRows) {
      await database.executeWithConnection({
        connection,
        sql: `
          insert into model_status (
            model_id,
            status,
            effective_from,
            effective_to,
            source_record_id,
            override_record_id,
            source_table,
            calculated_at,
            last_event
          ) values (
            :model_id,
            :status,
            :effective_from,
            :effective_to,
            :source_record_id,
            :override_record_id,
            :source_table,
            current_timestamp(0),
            :last_event::jsonb
          )
        `,
        args: toStatusInsertArgs(row)
      })
    }
  }

  return new ModelStateResolverWorker(database, recomputeResolved, { ...opts })
}

/**
 * Упрощённый helper чтения строк через уже открытое транзакционное соединение.
 *
 * @returns {Promise<object[]>}
 */
async function selectRows (database, connection, sql, args) {
  const res = await database.executeWithConnection({ connection, sql, args })
  return res.rows ?? []
}

/**
 * Возвращает текущее время Postgres в строковом SQL-формате `YYYY-MM-DD HH:mm:ss`.
 */
async function selectCurrentTimestamp (database, connection) {
  const rows = await selectRows(database, connection, `
    select to_char(current_timestamp(0), 'YYYY-MM-DD HH24:MI:SS') as current_ts
  `)

  return rows[0]?.CURRENT_TS ?? normalizeTimestamp(new Date())
}

/**
 * Собирает новый набор final-строк для одной сущности (`stage` или `status`).
 *
 * Основное правило:
 * - override с `source_record_id` заменяет конкретную source-запись;
 * - override без `source_record_id` добавляется как самостоятельная запись;
 * - source без замены попадает в final как есть.
 */
function resolveRows ({ entityName, modelId, sourceRows, overrideRows, finalSourceTable }) {
  const replacementBySourceId = new Map()
  const finalRows = []

  for (const overrideRow of overrideRows) {
    const sourceRecordId = overrideRow.SOURCE_RECORD_ID

    if (!sourceRecordId) {
      finalRows.push(buildOverrideFinalRow({
        entityName,
        overrideRow,
        sourceRecordId: null,
        sourceTable: finalSourceTable
      }))
      continue
    }

    if (replacementBySourceId.has(sourceRecordId)) {
      throw new Error(`${ entityName } override conflict for model ${ modelId }: duplicate source_record_id=${ sourceRecordId }`)
    }

    replacementBySourceId.set(sourceRecordId, overrideRow)
  }

  const sourceById = new Map(sourceRows.map((row) => [row.ID, row]))

  for (const [sourceRecordId, overrideRow] of replacementBySourceId.entries()) {
    if (!sourceById.has(sourceRecordId)) {
      throw new Error(`${ entityName } override conflict for model ${ modelId }: source_record_id=${ sourceRecordId } not found`)
    }

    finalRows.push(buildOverrideFinalRow({
      entityName,
      overrideRow,
      sourceRecordId,
      sourceTable: finalSourceTable
    }))
  }

  for (const sourceRow of sourceRows) {
    if (replacementBySourceId.has(sourceRow.ID)) {
      continue
    }

    finalRows.push(buildSourceFinalRow({
      entityName,
      sourceRow,
      sourceTable: `model_${ entityName }_source`
    }))
  }

  return finalRows
}

/**
 * Подмешивает служебные поля итоговой строки:
 * - `calculatedAt`;
 * - построчный `lastEvent`.
 *
 * Если строка по происхождению и бизнес-полям не изменилась,
 * `lastEvent` переносится из предыдущего состояния final-таблицы.
 */
function attachMetadata ({ rows, entityName, previousRows, calculatedAt, jobLastEvent }) {
  const previousByOrigin = new Map(previousRows.map((row) => [buildOriginKeyFromDbRow(row), row]))

  return rows.map((row) => {
    const previousRow = previousByOrigin.get(buildOriginKeyFromResolvedRow(row))
    const reusedLastEvent = previousRow && isSameBusinessRow(previousRow, row, entityName)
      ? normalizeLastEvent(previousRow.LAST_EVENT, { modelId: row.modelId })
      : null

    return {
      ...row,
      calculatedAt,
      lastEvent: reusedLastEvent ?? jobLastEvent
    }
  })
}

/**
 * Реализует правило для status override:
 * активные незаблокированные (`is_final_override = false`) корректировки
 * закрываются при появлении более поздней source-записи статуса.
 *
 * Закрытие происходит обновлением самой override-записи:
 * - `effective_to = effective_from` новой source-записи;
 * - `updated_at = current_timestamp(0)`.
 */
async function closeNonFinalStatusOverrides ({ database, connection, modelId, sourceRows, overrideRows, triggerEvent }) {
  if (!sourceRows.length || !overrideRows.length) return

  if (triggerEvent.table !== 'model_status_source' || triggerEvent.op !== 'INSERT') {
    return
  }

  const insertedSourceId = normalizeNullableInteger(triggerEvent.row_id)
  if (!insertedSourceId) return

  const insertedSourceRow = sourceRows.find((row) => row.ID === insertedSourceId)
  if (!insertedSourceRow) return

  const replacementBySourceId = new Map(
    overrideRows
      .filter((row) => normalizeNullableInteger(row.SOURCE_RECORD_ID))
      .map((row) => [normalizeNullableInteger(row.SOURCE_RECORD_ID), row])
  )

  // Source-статус, уже вытесненный override с source_record_id,
  // не должен закрывать standalone override.
  if (replacementBySourceId.has(insertedSourceId)) {
    return
  }

  const insertedSourceFrom = toDate(insertedSourceRow.EFFECTIVE_FROM)
  if (!insertedSourceFrom) return

  const standaloneOpenOverrides = overrideRows.filter((row) => (
    !normalizeNullableInteger(row.SOURCE_RECORD_ID) &&
    row.IS_FINAL_OVERRIDE === false &&
    normalizeTimestamp(row.EFFECTIVE_TO) === OPEN_INTERVAL
  ))

  for (const overrideRow of standaloneOpenOverrides) {
    const overrideFrom = toDate(overrideRow.EFFECTIVE_FROM)
    if (!overrideFrom) continue
    if (insertedSourceFrom <= overrideFrom) continue

    await database.executeWithConnection({
      connection,
      sql: `
        update model_status_override
        set
          effective_to = :effective_to,
          updated_at = current_timestamp(0)
        where id = :id
      `,
      args: {
        id: overrideRow.ID,
        effective_to: normalizeTimestamp(insertedSourceRow.EFFECTIVE_FROM)
      }
    })
  }
}

/**
 * Формирует final-строку из source-записи.
 */
function buildSourceFinalRow ({ entityName, sourceRow, sourceTable }) {
  return {
    modelId: sourceRow.MODEL_ID,
    value: sourceRow[entityName.toUpperCase()],
    effectiveFrom: sourceRow.EFFECTIVE_FROM,
    effectiveTo: sourceRow.EFFECTIVE_TO,
    sourceRecordId: sourceRow.ID,
    overrideRecordId: null,
    sourceTable
  }
}

/**
 * Формирует final-строку из override-записи.
 */
function buildOverrideFinalRow ({ entityName, overrideRow, sourceRecordId, sourceTable }) {
  return {
    modelId: overrideRow.MODEL_ID,
    value: overrideRow[entityName.toUpperCase()],
    effectiveFrom: overrideRow.EFFECTIVE_FROM,
    effectiveTo: overrideRow.EFFECTIVE_TO,
    sourceRecordId,
    overrideRecordId: overrideRow.ID,
    sourceTable
  }
}

/**
 * Проверяет инвариант итоговой таблицы статусов:
 * у модели не может быть более одного активного статуса одновременно.
 */
function validateSingleActiveStatus (statusRows, modelId) {
  const activeCount = statusRows.filter((row) => normalizeTimestamp(row.effectiveTo) === OPEN_INTERVAL).length

  if (activeCount > 1) {
    throw new Error(`status conflict for model ${ modelId }: expected at most one active status, got ${ activeCount }`)
  }
}

/**
 * Запускает опциональную валидацию override-значений.
 *
 * Если валидатор не передан, проверка пропускается.
 * Если значение невалидно, бросается ошибка, и задача остаётся в queue.
 */
function validateOverrideRows ({ entityName, overrideRows, modelId, validator }) {
  if (!validator) return

  const fieldName = entityName.toUpperCase()

  for (const overrideRow of overrideRows) {
    const value = overrideRow[fieldName]
    if (validator(value)) continue

    throw new Error(`${ entityName } override validation failed for model ${ modelId }: id=${ overrideRow.ID }, value="${ value }"`)
  }
}

/**
 * Собирает итоговые валидаторы из опций фабрики.
 */
function createValidators (opts) {
  return {
    stage: resolveValidator(opts.stageValidator, opts.validStages),
    status: resolveValidator(opts.statusValidator, opts.validStatuses)
  }
}

/**
 * Нормализует описание валидатора.
 *
 * Поддерживаются два варианта:
 * - функция-валидатор;
 * - массив допустимых значений.
 */
function resolveValidator (validator, allowedValues) {
  if (typeof validator === 'function') {
    return validator
  }

  if (Array.isArray(allowedValues) && allowedValues.length > 0) {
    const allowed = new Set(allowedValues.map((value) => String(value)))
    return (value) => allowed.has(String(value))
  }

  return null
}

/**
 * Строит ключ происхождения строки на основе in-memory представления.
 */
function buildOriginKeyFromResolvedRow (row) {
  return [
    row.sourceTable,
    row.sourceRecordId ?? 'null',
    row.overrideRecordId ?? 'null'
  ].join('|')
}

/**
 * Строит ключ происхождения строки на основе строки, прочитанной из final-таблицы.
 */
function buildOriginKeyFromDbRow (row) {
  return [
    row.SOURCE_TABLE,
    row.SOURCE_RECORD_ID ?? 'null',
    row.OVERRIDE_RECORD_ID ?? 'null'
  ].join('|')
}

/**
 * Сравнивает бизнес-содержимое старой и новой final-строки.
 * Если содержимое не изменилось, можно сохранить прежний `last_event`.
 */
function isSameBusinessRow (previousRow, row, entityName) {
  const fieldName = entityName.toUpperCase()

  return (
    previousRow.MODEL_ID === row.modelId &&
    previousRow[fieldName] === row.value &&
    normalizeTimestamp(previousRow.EFFECTIVE_FROM) === normalizeTimestamp(row.effectiveFrom) &&
    normalizeTimestamp(previousRow.EFFECTIVE_TO) === normalizeTimestamp(row.effectiveTo)
  )
}

/**
 * Нормализует `last_event` к согласованному JSON-формату.
 */
function normalizeLastEvent (lastEvent, { modelId, fallbackAt }) {
  const base = lastEvent && typeof lastEvent === 'object' && !Array.isArray(lastEvent)
    ? lastEvent
    : {}

  return {
    table: typeof base.table === 'string' ? base.table : 'model_recalc_queue',
    op: typeof base.op === 'string' ? base.op : 'UPDATE',
    at: normalizeEventTimestamp(base.at, fallbackAt),
    row_id: normalizeNullableInteger(base.row_id ?? base.rowId ?? null),
    model_id: typeof base.model_id === 'string' ? base.model_id : modelId,
    source_system: typeof base.source_system === 'string' ? base.source_system : null
  }
}

/**
 * Приводит значение времени события к строковому представлению.
 */
function normalizeEventTimestamp (value, fallbackAt) {
  if (!value) return fallbackAt ?? normalizeTimestamp(new Date())
  if (value instanceof Date) return fallbackAt ?? normalizeTimestamp(value)
  return normalizeTimestamp(value)
}

/**
 * Возвращает integer или `null`.
 */
function normalizeNullableInteger (value) {
  if (value === null || value === undefined) return null

  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

/**
 * Нормализует timestamp к SQL-строке `YYYY-MM-DD HH:mm:ss`.
 */
function normalizeTimestamp (value) {
  if (value instanceof Date) {
    return toLocalSqlTimestamp(value)
  }

  if (typeof value === 'string') {
    return value.slice(0, 19).replace('T', ' ')
  }

  return String(value)
}

/**
 * Преобразует Date в локальную SQL-строку `YYYY-MM-DD HH:mm:ss`
 * без перевода в UTC.
 */
function toLocalSqlTimestamp (value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  const seconds = String(value.getSeconds()).padStart(2, '0')

  return `${ year }-${ month }-${ day } ${ hours }:${ minutes }:${ seconds }`
}

/**
 * Пытается привести значение к `Date`.
 *
 * @returns {Date|null}
 */
function toDate (value) {
  if (value instanceof Date) return value

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Формирует набор аргументов для `insert into model_stage`.
 * Возвращает только реально используемые плейсхолдеры, чтобы не ломать `queryConvert`.
 */
function toStageInsertArgs (row) {
  return {
    model_id: row.modelId,
    stage: row.value,
    effective_from: row.effectiveFrom,
    effective_to: row.effectiveTo,
    source_record_id: row.sourceRecordId,
    override_record_id: row.overrideRecordId,
    source_table: row.sourceTable,
    last_event: JSON.stringify(row.lastEvent)
  }
}

/**
 * Формирует набор аргументов для `insert into model_status`.
 * Возвращает только реально используемые плейсхолдеры, чтобы не ломать `queryConvert`.
 */
function toStatusInsertArgs (row) {
  return {
    model_id: row.modelId,
    status: row.value,
    effective_from: row.effectiveFrom,
    effective_to: row.effectiveTo,
    source_record_id: row.sourceRecordId,
    override_record_id: row.overrideRecordId,
    source_table: row.sourceTable,
    last_event: JSON.stringify(row.lastEvent)
  }
}

module.exports = createModelStateResolverWorker
