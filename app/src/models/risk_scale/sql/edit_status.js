const sql = `
    UPDATE 
        RISK_SCALES
    SET
        RISK_SCALE_IS_ACTIVE_FLG = :RISK_SCALE_STATUS
    WHERE
        ROOT_RISK_SCALE_ID = :ROOT_RISK_SCALE_ID
`

module.exports = sql
