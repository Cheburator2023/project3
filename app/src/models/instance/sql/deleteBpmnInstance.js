const sql = `
    DELETE FROM
        BPMN_INSTANCES
    WHERE
        BPMN_INSTANCE_ID = ANY (:bpmnIds::text[])
`

module.exports = sql
