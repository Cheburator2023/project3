const sql = `
    SELECT * 
    FROM ROOT_ASSIGNMENT ra
    INNER JOIN ASSIGNMENT_X_MODEL axm
    ON 
        axm.ROOT_ASSIGNMENT_ID = ra.ID
    AND 
        axm.MODEL_ID =:MODEL_ID
    AND 
        axm.EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
`

module.exports = sql