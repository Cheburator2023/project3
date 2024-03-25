const sql = `
    SELECT *
        FROM BPMN_INSTANCES
    WHERE
        MODEL_ID = :modelId
`

module.exports = sql