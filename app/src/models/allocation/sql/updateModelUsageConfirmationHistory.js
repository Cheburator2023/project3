const sql = `
INSERT
INTO model_usage_confirm_history (model_id, quarter, artifact_link, creator_full_name)
VALUES (:MODEL_ID, :QUARTER::Int, :ARTIFACT_LINK, :CREATOR_FULL_NAME);
`

module.exports = sql
