const sql = `
    DELETE FROM RISK_SCALE_X_MODEL
        WHERE 
            ROOT_RISK_SCALE_ID = :ROOT_RISK_SCALE_ID
        AND
            MODEL_ID = :MODEL_ID
`

module.exports = sql
