const sql = `
INSERT
INTO model_allocation_usage_history (usage_id, field, value, creator_full_name)
VALUES (:USAGE_ID, :FIELD, :VALUE, :CREATOR_FULL_NAME);
`

module.exports = sql
