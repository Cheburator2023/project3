const sql = `
SELECT *
FROM model_usage_confirm_history
WHERE model_id = :MODEL_ID
  AND quarter = :QUARTER::Int
  AND effective_year = :EFFECTIVE_YEAR::Int
ORDER BY effective_from DESC;
`

module.exports = sql
