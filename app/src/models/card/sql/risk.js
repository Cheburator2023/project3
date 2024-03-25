const sql = `
    SELECT * 
    FROM RISK_SCALES rs
    INNER JOIN RISK_SCALE_X_MODEL rsm
    ON 
        rsm.ROOT_RISK_SCALE_ID = rs.ROOT_RISK_SCALE_ID
    AND 
        rsm.MODEL_ID = :MODEL_ID
`

module.exports = sql