const sql = `
    SELECT *
    FROM BPMN_INSTANCES
    WHERE
        MODEL_ID = :model
    AND 
        EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
    AND
        BPMN_KEY_ID <> (
            SELECT
                BPMN_KEY_ID
            FROM 
                BPMN_PROCESSES
            WHERE
                BPMN_KEY_DESC = 'cancel'
        )
`

module.exports = sql