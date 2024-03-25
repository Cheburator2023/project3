const sql = `
    UPDATE BPMN_INSTANCES
    SET 
        EFFECTIVE_TO = current_timestamp(0)
    WHERE
        BPMN_INSTANCE_ID = :instance
    AND
        MODEL_ID = :model
`

module.exports = sql