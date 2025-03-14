const sql = `
INSERT
INTO model_usage_confirm_history (model_id, effective_year, quarter, artifact_link, creator_full_name, confirmed)
VALUES (:MODEL_ID, :CONFIRMATION_YEAR, :QUARTER::Int, :ARTIFACT_LINK, :CREATOR_FULL_NAME, :CONFIRMED);
`

module.exports = sql
