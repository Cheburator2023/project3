const sql = `
    INSERT INTO BPMN_INSTANCES
        (
            BPMN_INSTANCE_ID,
            MODEL_ID,
            BPMN_KEY_ID
        )
    VALUES
        (
            :instance,
            :model,
            (
                SELECT 
                    BPMN_KEY_ID
                FROM 
                    BPMN_PROCESSES
                WHERE
                    BPMN_KEY_DESC = :key
            )
        )

`

module.exports = sql