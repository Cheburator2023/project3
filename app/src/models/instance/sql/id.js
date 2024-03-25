const sql = `
    SELECT *
    FROM BPMN_INSTANCES
    WHERE
        BPMN_INSTANCE_ID = :id
`

module.exports = sql