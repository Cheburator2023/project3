# model state resolver worker

## Назначение

`model state resolver worker` пересчитывает итоговые таблицы:

- `model_stage`
- `model_status`

на основании двух слоёв данных:

- source-таблиц `model_stage_source` и `model_status_source`
- override-таблиц `model_stage_override` и `model_status_override`

Главная идея механизма:

1. Внешняя система, сейчас Camunda, пишет только в source-таблицы.
2. Ручные и системные корректировки пишутся только в override-таблицы.
3. Итоговые данные для чтения формирует только воркер.
4. На каждое изменение source/override таблиц модель попадает в `model_recalc_queue`.

## Структура папки

```text
model_state_resolver/
  README.md
  index.js
  runtime/
    create_model_state_resolver_worker.js
    model_state_resolver_worker.js
  sql/
    migrations.sql
```

Где:

- `runtime/` содержит код воркера и фабрику его создания;
- `sql/` содержит миграцию схемы;
- `index.js` является точкой экспорта модуля.

## Базовая логика

Для одной модели пересчёт идёт в рамках одной транзакции.

Шаги:

1. Воркер берёт `model_id` из `model_recalc_queue`.
2. Читает source-записи этапов и статусов.
3. Читает override-записи этапов и статусов.
4. Для статусов при необходимости закрывает активные незаблокированные override:
   - если `is_final_override = false`
   - и появилась более поздняя source-запись статуса.
5. Применяет правила сборки final-таблиц.
6. Полностью заменяет строки этой модели в `model_stage` и `model_status`.
7. При успехе удаляет запись из очереди.
8. При ошибке оставляет запись в очереди, увеличивает `attempts` и пишет `last_error`.

## Правила сборки итоговых записей

### Этапы

- source-запись без замены попадает в `model_stage` как есть;
- override с `source_record_id` заменяет конкретную source-запись;
- override без `source_record_id` попадает как самостоятельная запись;
- несколько активных этапов одновременно допустимы.

### Статусы

- source-запись без замены попадает в `model_status` как есть;
- override с `source_record_id` заменяет конкретную source-запись;
- override без `source_record_id` попадает как самостоятельная запись;
- одновременно допускается только один активный статус;
- если это правило нарушено, пересчёт считается ошибочным.

### Поле `is_final_override`

`is_final_override` используется только в override-таблицах.

- `true`:
  корректировка считается финальной и не вытесняется последующими source-записями.
- `false`:
  поведение зависит от сущности.

Для этапов:

- новая source-запись не закрывает такую корректировку.

Для статусов:

- новая source-запись закрывает активную override-запись;
- закрытие выполняется установкой `effective_to`, равного `effective_from` новой source-записи.

## Таблицы

### `model_stage_source`

Источник этапов из внешней системы.

Колонки:

- `id serial` — первичный ключ source-записи.
- `model_id varchar(4000)` — идентификатор модели.
- `stage varchar(4000)` — значение этапа.
- `effective_from timestamp` — начало действия.
- `effective_to timestamp` — окончание действия.
- `source_system varchar(255)` — источник записи, по умолчанию `Camunda`.

### `model_status_source`

Источник статусов из внешней системы.

Колонки:

- `id serial` — первичный ключ source-записи.
- `model_id varchar(4000)` — идентификатор модели.
- `status varchar(4000)` — значение статуса.
- `effective_from timestamp` — начало действия.
- `effective_to timestamp` — окончание действия.
- `source_system varchar(255)` — источник записи, по умолчанию `Camunda`.

### `model_stage_override`

Корректировки этапов.

Колонки:

- `id serial` — первичный ключ корректировки.
- `model_id varchar(4000)` — идентификатор модели.
- `source_record_id integer` — ссылка на `model_stage_source.id`, если корректировка заменяет source-запись.
- `stage varchar(4000)` — итоговое значение этапа.
- `effective_from timestamp` — начало действия корректировки.
- `effective_to timestamp` — окончание действия корректировки.
- `correction_reason text` — человекочитаемая причина корректировки.
- `is_final_override boolean` — финальная ли корректировка.
- `author varchar(4000)` — кто внёс корректировку.
- `created_at timestamp` — время создания.
- `updated_at timestamp` — время последнего изменения.

### `model_status_override`

Корректировки статусов.

Колонки:

- `id serial` — первичный ключ корректировки.
- `model_id varchar(4000)` — идентификатор модели.
- `source_record_id integer` — ссылка на `model_status_source.id`, если корректировка заменяет source-запись.
- `status varchar(4000)` — итоговое значение статуса.
- `effective_from timestamp` — начало действия корректировки.
- `effective_to timestamp` — окончание действия корректировки.
- `correction_reason text` — человекочитаемая причина корректировки.
- `is_final_override boolean` — финальная ли корректировка.
- `author varchar(4000)` — кто внёс корректировку.
- `created_at timestamp` — время создания.
- `updated_at timestamp` — время последнего изменения.

### `model_stage`

Итоговая таблица этапов.

Колонки:

- `id serial` — первичный ключ final-записи.
- `model_id varchar(4000)` — идентификатор модели.
- `stage varchar(4000)` — итоговый этап.
- `effective_from timestamp` — начало действия.
- `effective_to timestamp` — окончание действия.
- `source_record_id integer` — source-источник, если строка пришла из source.
- `override_record_id integer` — override-источник, если строка пришла из override.
- `source_table varchar(255)` — `model_stage_source` или `model_stage_override`.
- `calculated_at timestamp` — время последнего пересчёта этой final-строки.
- `last_event jsonb` — последнее событие, относящееся именно к этой строке.

### `model_status`

Итоговая таблица статусов.

Колонки:

- `id serial` — первичный ключ final-записи.
- `model_id varchar(4000)` — идентификатор модели.
- `status varchar(4000)` — итоговый статус.
- `effective_from timestamp` — начало действия.
- `effective_to timestamp` — окончание действия.
- `source_record_id integer` — source-источник, если строка пришла из source.
- `override_record_id integer` — override-источник, если строка пришла из override.
- `source_table varchar(255)` — `model_status_source` или `model_status_override`.
- `calculated_at timestamp` — время последнего пересчёта этой final-строки.
- `last_event jsonb` — последнее событие, относящееся именно к этой строке.

### `model_recalc_queue`

Очередь пересчёта.

Колонки:

- `model_id varchar(4000)` — модель, которую нужно пересчитать.
- `updated_at timestamp` — время последнего enqueue/update.
- `sources text[]` — список таблиц, вызвавших пересчёт.
- `last_event jsonb` — последнее входное событие для модели.
- `attempts integer` — число неудачных попыток.
- `last_error text` — последняя ошибка пересчёта.
- `last_error_at timestamp` — время последней ошибки.
- `next_attempt_at timestamp` — время следующей разрешённой попытки.

## Формат `last_event`

`last_event` хранится в согласованном JSON-формате:

```json
{
  "table": "model_status_source",
  "op": "INSERT",
  "at": "2026-04-06T12:03:14.648632+03:00",
  "row_id": 17,
  "model_id": "6a473496-3197-11f1-b6a6-0242ac130003",
  "source_system": "Camunda"
}
```

Важно:

- `last_event` в final-таблицах не должен одинаково затираться у всех строк модели;
- если строка не изменилась по бизнес-смыслу, её старый `last_event` сохраняется.

## Валидация override

Воркер поддерживает опциональную валидацию значений `stage` и `status`.

Варианты подключения:

- передать функцию-валидатор;
- передать массив допустимых значений.

Если валидация не настроена, она отключена.

Если настроена и значение невалидно:

- пересчёт модели завершается ошибкой;
- модель остаётся в `model_recalc_queue`;
- final-таблицы по этой модели не обновляются.

Это `strict mode`.

### Пример подключения воркера с валидацией

```js
const { createModelStateResolverWorker } = require('./connectors/database/postgres/workers/model_state_resolver')

const modelStateResolverWorker = createModelStateResolverWorker(database, {
  logger,
  validStages: [
    'Инициализация',
    'Разработка модели',
    'Внедрение'
    // ...
  ],
  validStatuses: [
    'Архив',
    'В процессе разработки',
    'Внедрена в ПИМ'
  ]
})
```

Что это означает:

- если в `model_stage_override.stage` придёт значение, которого нет в `validStages`, пересчёт модели завершится ошибкой;
- если в `model_status_override.status` придёт значение, которого нет в `validStatuses`, пересчёт модели завершится ошибкой;
- запись по модели останется в `model_recalc_queue` до исправления данных.

## Массовая загрузка корректировок

Ниже пример: какие поля нужно собрать, чтобы загрузить несколько корректировок статусов.

```sql
insert into model_status_override (
  model_id,
  source_record_id,
  status,
  effective_from,
  effective_to,
  correction_reason,
  is_final_override,
  author,
  created_at,
  updated_at
)
values
  (
    '6a473496-3197-11f1-b6a6-0242ac130003',
    17,
    'Архив',
    timestamp '2026-04-10 09:00:00',
    timestamp '9999-12-31 23:59:59',
    'Корректировка по результатам тестирования',
    true,
    'ivanov',
    current_timestamp(0),
    current_timestamp(0)
  ),
  (
    '8cdb3a74-3197-11f1-b6a6-0242ac130003',
    null,
    'В процессе разработки',
    timestamp '2026-04-11 10:00:00',
    timestamp '9999-12-31 23:59:59',
    'Массовая загрузка корректировок БКРС',
    false,
    'bulk_loader',
    current_timestamp(0),
    current_timestamp(0)
  );
```

Как читать этот пример:

- `model_id` — обязательный идентификатор модели;
- `source_record_id`:
  - указывается, если корректировка заменяет конкретную source-запись;
  - `null`, если это новая самостоятельная корректировка;
- `status` — итоговое значение;
- `effective_from` и `effective_to` — интервал действия;
- `correction_reason` — обязательное объяснение причины;
- `is_final_override`:
  - `true` — не вытесняется последующим source;
  - `false` — для статусов может быть закрыта новой source-записью;
- `author` — кто внёс изменение;
- `created_at`, `updated_at` — технические поля аудита.

Аналогично загружаются этапы через `model_stage_override`, только вместо `status` используется `stage`.

## Разбор важного сценария со статусами

Ниже пример, который важно понимать до внесения корректировок статусов.

### Сценарий

1. Создаётся модель с `model_id = 'AAA'`.
2. В `model_status_source` появляется запись:
   - `status = 'Init'`
   - `effective_to = '9999-12-31 23:59:59'`
3. Модель движется дальше по процессу:
   - старая запись `Init` закрывается;
   - в `model_status_source` появляется новая запись:
     - `status = 'Data'`
     - `effective_to = '9999-12-31 23:59:59'`
4. После этого добавляется корректировка в `model_status_override`:
   - `source_record_id = null`
   - `is_final_override = false`

### Что не происходит

Такая корректировка:

- не заменяет запись `Data` в `model_status_source`;
- не закрывает запись `Data` в `model_status_source`;
- не меняет `effective_to` у source-записи `Data`.

Причина:

- корректировка без `source_record_id` считается новой самостоятельной записью;
- она не привязана к конкретной source-строке;
- воркер не закрывает текущую source-запись только из-за появления такой override.

### Что произойдёт дальше

После пересчёта у модели окажутся одновременно активными:

- source-статус `Data`;
- новая override-запись статуса.

Так как в итоговом состоянии одновременно разрешён только один активный статус:

- пересчёт завершится ошибкой;
- модель останется в `model_recalc_queue`;
- final-таблица `model_status` для этой модели не обновится.

### Когда такая override всё же будет закрыта

Если позже в `model_status_source` появится ещё одна новая source-запись статуса, тогда:

- активная незаблокированная override-запись с `is_final_override = false`
  может быть автоматически закрыта воркером;
- закрытие выполняется установкой `effective_to`, равного `effective_from`
  новой source-записи.

### Практический вывод

Если корректировка статуса должна заменить текущий статус модели, а не существовать как отдельная запись, безопаснее:

- либо указывать `source_record_id`;
- либо использовать `is_final_override = true`, если нужна финальная ручная фиксация;
- либо заранее понимать, что override без `source_record_id` может привести к блокирующему конфликту активных статусов.

## Что важно помнить

- Camunda пишет только в source-таблицы.
- Final-таблицы заполняет только воркер.
- Очередь дедуплицирована по `model_id`.
- Для одной модели пересчёт идёт целиком.
- Ошибка в одной override-записи блокирует обновление всей модели в final-таблицах.
