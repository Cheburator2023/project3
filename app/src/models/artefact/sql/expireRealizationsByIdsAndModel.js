const sql = `
    UPDATE artefact_realizations
    SET effective_to = current_timestamp(0)
    WHERE
        artefact_id = ANY (:artefact_ids)
        AND model_id = :model_id
        AND effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
`

module.exports = sql
