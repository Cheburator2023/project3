const sql = `
    SELECT * FROM MODELS m
    LEFT JOIN RISK_SCALE_X_MODEL rsxm
        ON m.MODEL_ID = rsxm.MODEL_ID
    WHERE ROOT_RISK_SCALE_ID = :ROOT_RISK_SCALE_ID
`

module.exports = sql
