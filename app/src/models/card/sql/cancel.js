const sql = `
    UPDATE 
        MODELS
    SET 
        MODELS_IS_ACTIVE_FLG = '0', 
        UPDATE_DATE = current_timestamp(0)
    WHERE 
        MODEL_ID = :model
`

module.exports = sql