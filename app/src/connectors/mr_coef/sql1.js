const sql = `
UPDATE artefact_realizations target
SET artefact_string_value = source.coefficient
FROM (
    SELECT ar1.model_id,
    CASE
        WHEN ar2.artefact_string_value IS NULL
            THEN NULL
        WHEN ar2.artefact_string_value::int = 0 OR
             floor((extract(year from age(current_timestamp, to_timestamp(ar1.artefact_string_value, 'DD.MM.YYYY HH24:MI'))) * 12 +
                    extract(months from age(current_timestamp, to_timestamp(ar1.artefact_string_value, 'DD.MM.YYYY HH24:MI')))) / 12) < 1
            THEN 1
        ELSE
             1.3 + 0.1 * (floor((extract(year from age(current_timestamp, to_timestamp(ar1.artefact_string_value, 'DD.MM.YYYY HH24:MI'))) * 12 +
                                 extract(months from age(current_timestamp, to_timestamp(ar1.artefact_string_value, 'DD.MM.YYYY HH24:MI')))) / 12) - 1)
    END AS coefficient
    FROM artefact_realizations ar1
        LEFT JOIN
            artefact_realizations ar2
        ON ar1.model_id = ar2.model_id
        WHERE ar1.artefact_id = 486 -- Дата протокола КУОРР
          AND ar2.artefact_id = 507 -- Результат валидации
          AND ar1.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
          AND ar2.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
) AS source
WHERE target.model_id = source.model_id
  AND target.artefact_id = 551 -- Коэф А. - устаревания
  AND target.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
`
module.exports = sql
