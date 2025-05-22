const sql = `
SELECT model_id, artefact_string_value
FROM artefact_realizations
WHERE artefact_id = 7
  AND effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
  AND model_id = ANY(:modelIds::text[])
`

module.exports = sql;