const sql = `
UPDATE artefact_realizations target
SET artefact_string_value = source.coefficient
FROM (
    SELECT
        ar1.model_id,
        CASE
            WHEN ar4.artefact_string_value IS NULL
              THEN '1'
            WHEN ar2.artefact_string_value::numeric IS NULL
              THEN ar3.artefact_string_value::varchar(4000)
            WHEN ar2.artefact_string_value::numeric * ar3.artefact_string_value::numeric < 1
              THEN (ar2.artefact_string_value::numeric * ar3.artefact_string_value::numeric)::varchar(4000)
            ELSE '1'
        END AS coefficient
        FROM artefact_realizations ar1
            LEFT JOIN
                artefact_realizations ar2
            ON ar1.model_id = ar2.model_id
            LEFT JOIN
                artefact_realizations ar3
            ON ar1.model_id = ar3.model_id
            LEFT JOIN
                artefact_realizations ar4
        ON ar1.model_id = ar4.model_id
        WHERE ar1.artefact_id = 559 -- Итоговое значение Коэф К-модели и процесса (с учетом устаревания)
          AND ar2.artefact_id = 551 -- Коэф А. - устаревания
          AND ar3.artefact_id = 558 -- Коэф с учетом смежности желтых на уровне коэффициентов
          AND ar4.artefact_id = 486 -- дата протокола КУОРР
          AND ar1.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
          AND ar2.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
          AND ar3.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
          AND ar4.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
) AS source
WHERE target.model_id = source.model_id
  AND target.artefact_id = 559 -- Итоговое значение Коэф К-модели и процесса (с учетом устаревания)
  AND target.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
`

module.exports = sql
