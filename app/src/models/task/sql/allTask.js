const sql = `
    SELECT
        t1.*,
        t2.*,
        t3.*,
        t1.BPMN_INSTANCE_ID
    FROM
        BPMN_INSTANCES t1
    INNER JOIN
        (
            SELECT 
                regexp_substr( :idxbpmn, '[^,]+,[^,]+', 1, level) AS fltr_string,
                SUBSTR(regexp_substr( :idxbpmn, '[^,]+,[^,]+', 1, level), 1, INSTR(regexp_substr( :idxbpmn, '[^,]+,[^,]+', 1, level), ',') - 1) AS TASK_ID,
                SUBSTR(regexp_substr( :idxbpmn, '[^,]+,[^,]+', 1, level), INSTR(regexp_substr( :idxbpmn, '[^,]+,[^,]+', 1, level), ',') + 1) AS BPMN_INSTANCE_ID
            FROM  
                DUAL
            CONNECT BY regexp_substr( :idxbpmn , '[^,]+,[^,]+', 1, level) is not null
        ) FLTR
    ON 
        t1.BPMN_INSTANCE_ID = FLTR.BPMN_INSTANCE_ID
    INNER JOIN
        TASKS t2
    ON
        t2.TASK_ID = FLTR.TASK_ID
    INNER JOIN
        MODELS t3
    ON
        t3.MODEL_ID = t1.MODEL_ID
`

module.exports = sql