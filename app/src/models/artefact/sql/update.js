const sql = `
    UPDATE 
        ARTEFACT_REALIZATIONS
    SET
        EFFECTIVE_TO = current_timestamp(0)
    WHERE
        ARTEFACT_ID = ANY (:ARTEFACT_IDS)
    AND
        MODEL_ID = :MODEL_ID
`

module.exports = sql
