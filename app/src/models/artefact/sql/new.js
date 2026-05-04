const sql = `
    INSERT INTO
    ARTEFACT_REALIZATIONS
        (
            MODEL_ID,
            ARTEFACT_ID,
            ARTEFACT_VALUE_ID,
            ARTEFACT_STRING_VALUE,
            ARTEFACT_ORIGINAL_VALUE,
            CREATOR
        )
    VALUES
        (
            :MODEL_ID,
            :ARTEFACT_ID,
            :ARTEFACT_VALUE_ID,
            :ARTEFACT_STRING_VALUE,
            :ARTEFACT_ORIGINAL_VALUE,
            :CREATOR
        )
`

module.exports = sql