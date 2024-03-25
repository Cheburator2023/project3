/*
    Должен все связанные версии
*/


const sql = `
    SELECT DISTINCT
        MODEL_VERSION
    FROM
        MODELS t1
    INNER JOIN
        BPMN_INSTANCES t2
    ON 
        t1.MODEL_ID = t2.MODEL_ID
    INNER JOIN
        BPMN_PROCESSES t3
    ON
        t3.BPMN_KEY_ID = t2.BPMN_KEY_ID
    WHERE
        t1.ROOT_MODEL_ID = :ROOT_MODEL_ID
`

module.exports = sql