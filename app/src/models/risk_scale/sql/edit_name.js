const sql = `
    UPDATE 
        RISK_SCALES
    SET
        RISK_SCALE_NAME = :RISK_SCALE_NAME
    WHERE
        ROOT_RISK_SCALE_ID = :ROOT_RISK_SCALE_ID
`

module.exports = sql
