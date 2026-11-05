-- СУМ (Postgres sumd): «AI-модели партнерств» в справочник Стрим-исполнитель (artefact_id = 7).
-- Старые значения не деактивируем.
-- На sumd нет колонки sort_order — не указываем.
--
-- Проверка ДО:
--   SELECT artefact_value_id, artefact_value, artefact_value_label, is_active_flg
--   FROM artefact_values WHERE artefact_id = 7 ORDER BY artefact_value_id;
--
-- Колонки:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'artefact_values' ORDER BY ordinal_position;

INSERT INTO artefact_values (
  artefact_value_id,
  artefact_id,
  artefact_value,
  artefact_value_label,
  is_active_flg,
  artefact_parent_value_id
)
SELECT
  (SELECT COALESCE(MAX(artefact_value_id), 0) + 1 FROM artefact_values),
  7,
  'AI-модели партнерств',
  'AI-модели партнерств',
  '1',
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM artefact_values
  WHERE artefact_id = 7
    AND artefact_value = 'AI-модели партнерств'
);
