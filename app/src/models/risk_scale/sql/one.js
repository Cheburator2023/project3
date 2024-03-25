const sql = `
    SELECT * FROM RISK_SCALES
    WHERE ROOT_RISK_SCALE_ID = :ROOT_RISK_SCALE_ID
`

module.exports = sql
