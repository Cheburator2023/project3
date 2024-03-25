const sql = `
    UPDATE 
        RISK_SCALES
    SET
        RISK_SCALE_DESC = :RISK_SCALE_DESC
    WHERE
        ROOT_RISK_SCALE_ID = :ROOT_RISK_SCALE_ID
`

module.exports = sql
