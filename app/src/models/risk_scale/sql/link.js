const sql = `
    INSERT INTO RISK_SCALE_X_MODEL
        (
            ROOT_RISK_SCALE_ID,
            MODEL_ID
        )
    VALUES
        (
            :ROOT_RISK_SCALE_ID,
            :MODEL_ID
        )
`

module.exports = sql
