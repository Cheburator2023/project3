const sql = `
SELECT *
FROM model_allocation_usage_history
WHERE usage_id = :USAGE_ID
  AND field = :FIELD
ORDER BY effective_from DESC;
`

module.exports = sql
