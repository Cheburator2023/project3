const sql = `
SELECT *
FROM model_allocation_usage
WHERE model_id = :model_id;
`

module.exports = sql
