const sql = `
SELECT * from model_usage_confirm
WHERE model_id = :model_id
`

module.exports = sql
