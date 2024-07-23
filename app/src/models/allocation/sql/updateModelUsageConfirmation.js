const sql = `
WITH cte AS (
    SELECT DISTINCT :QUARTER::Int                                   AS quarter,
                    :MODEL_ID                                       AS model_id,
                    :ARTIFACT_LINK                                  AS artifact_link,
                    COALESCE(:CONFIRMATION_DATE::TIMESTAMPTZ, NULL) AS confirmation_date,
                    :CONFIRMATION_YEAR::Int                         AS confirmation_year,
                    COALESCE(:CONFIRMED::Boolean, FALSE)            AS confirmed
)
INSERT
INTO model_usage_confirm (model_id, quarter, artifact_link, confirmation_date, confirmation_year, confirmed)
SELECT model_id,
       quarter,
       artifact_link,
       confirmation_date,
       confirmation_year,
       confirmed
FROM cte
ON CONFLICT (model_id, quarter, confirmation_year)
    DO UPDATE SET artifact_link     = CASE
                                          WHEN EXCLUDED.artifact_link IS NOT NULL
                                              THEN EXCLUDED.artifact_link
                                          ELSE model_usage_confirm.artifact_link
    END,
                  confirmation_date = COALESCE(EXCLUDED.confirmation_date, model_usage_confirm.confirmation_date)
RETURNING model_id, quarter, artifact_link, confirmed;
`

module.exports = sql
