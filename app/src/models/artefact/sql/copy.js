const sql = `
INSERT INTO ARTEFACT_REALIZATIONS 
    (
        ARTEFACT_ID,
        ARTEFACT_VALUE_ID,
        ARTEFACT_STRING_VALUE,
        MODEL_ID
    )
VALUES 
    (
        (
            SELECT 
                ARTEFACT_ID,
                ARTEFACT_VALUE_ID,
                ARTEFACT_STRING_VALUE
            FROM
                ARTEFACT_REALIZATIONS
            WHERE
                MODEL_ID = :PARENT_MODEL_ID
        ),
        :MODEL_ID
    )
`

module.exports = sql