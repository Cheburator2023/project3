const sql = `
    UPDATE BPMN_INSTANCES
    SET 
        EFFECTIVE_TO = current_timestamp(0)
    WHERE
        BPMN_KEY_ID = (
            SELECT 
                BPMN_KEY_ID
            FROM 
                BPMN_PROCESSES
            WHERE
                BPMN_KEY_DESC = :key
                
        )
    AND
        MODEL_ID = :model
`

module.exports = sql