const sql = `
WITH cte AS (
    SELECT DISTINCT
        :ALLOCATION_ID::Int  AS allocation_id,
        :MODEL_ID            AS model_id,
        NULLIF(:PERCENTAGE::Numeric, NULL) AS percentage,
        NULLIF(:COMMENT, NULL)             AS comment
)
INSERT INTO model_allocation_usage (allocation_id, model_id, percentage, comment)
SELECT allocation_id, model_id, percentage, comment
FROM cte
ON CONFLICT (allocation_id, model_id)
    DO UPDATE
    SET percentage = COALESCE(EXCLUDED.percentage, model_allocation_usage.percentage),
        comment    = COALESCE(EXCLUDED.comment, model_allocation_usage.comment)
RETURNING usage_id, allocation_id, model_id;
`

module.exports = sql
