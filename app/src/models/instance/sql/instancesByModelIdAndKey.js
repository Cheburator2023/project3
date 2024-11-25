const sql = `
    SELECT *
        FROM bpmn_instances bi
    JOIN bpmn_processes bp ON bi.bpmn_key_id = bp.bpmn_key_id
    WHERE
        bi.model_id = :model
        AND bp.bpmn_key_desc = :key
    ORDER BY bi.effective_to DESC
`

module.exports = sql
