const sql = `
    UPDATE BPMN_INSTANCES
    SET 
        EFFECTIVE_TO = current_timestamp(0)
    WHERE
        BPMN_INSTANCE_ID in (
            SELECT 
                t1.BPMN_INSTANCE_ID
            FROM BPMN_INSTANCES t1
            INNER JOIN
                BPMN_PROCESSES t2
            ON 
                t1.BPMN_KEY_ID = t2.BPMN_KEY_ID
            AND
                t2.BPMN_KEY_DESC = :key
            AND
                t1.MODEL_ID = :model
            AND
                t1.EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
        )
`

module.exports = sql