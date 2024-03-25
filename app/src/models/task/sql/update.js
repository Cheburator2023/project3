const sql = `
    UPDATE 
        ARTEFACT_REALIZATIONS
    SET
        EFFECTIVE_TO = current_timestamp(0)
    WHERE
        ARTEFACT_ID in (
            SELECT 
                regexp_substr( :ARTEFACT_ID ,'[^,]+', 1, level) 
            FROM  
                DUAL
            CONNECT BY regexp_substr( :ARTEFACT_ID , '[^,]+', 1, level) is not null
        )
    AND
        MODEL_ID = :MODEL_ID
`

module.exports = sql