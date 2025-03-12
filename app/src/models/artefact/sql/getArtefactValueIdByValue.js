const sql = `
    SELECT *
    FROM artefact_values av
    WHERE av.artefact_id = :artefact_id
        AND av.artefact_value = :value
        AND av.is_active_flg = '1'
`

module.exports = sql
