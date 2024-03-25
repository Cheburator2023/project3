/*
    Должен возвращать main шаги.
*/

const sql = `
    SELECT
        BIFLTR_.BPMN_INSTANCE_ID,
        BIFLTR_.MODEL_ID,
        BIFLTR_.CREATE_DTTM,
        BIFLTR_.BPMN_KEY_ID, 
        BIFLTR_.BPMN_PARENT_ID,
        BIFLTR_.EFFECTIVE_FROM,
        BIFLTR_.EFFECTIVE_TO,
        BIFLTR_.BPMN_KEY_DESC
    FROM 
        (
        SELECT
            BI_.BPMN_INSTANCE_ID,
            BI_.MODEL_ID,
            BI_.CREATE_DTTM,
            BI_.BPMN_KEY_ID, 
            BI_.BPMN_PARENT_ID,
            BI_.EFFECTIVE_FROM,
            BI_.EFFECTIVE_TO,
            BP_.BPMN_KEY_DESC,
            ROW_NUMBER() OVER(PARTITION BY BI_.BPMN_KEY_ID ORDER BY BI_.EFFECTIVE_FROM DESC) AS RN_
        FROM BPMN_INSTANCES BI_
        INNER JOIN BPMN_PROCESSES BP_
            ON BI_.BPMN_KEY_ID = BP_.BPMN_KEY_ID
        WHERE BI_.MODEL_ID = :MODEL_ID
            AND BP_.BPMN_KEY_DESC IN ('initialization', 'data', 'model', 'integration', 'monitoring', 'validation', 'removal')
        ) BIFLTR_
    WHERE BIFLTR_.RN_ = 1
`

module.exports = sql