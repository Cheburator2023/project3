const sql = `
    INSERT INTO ASSIGNMENT_ARTEFACT_REALIZATIONS
        (
            ARTEFACT_ID,
            ASSIGNMENT_ID,
            ARTEFACT_VALUE_ID,
            ARTEFACT_STRING_VALUE,
            ARTEFACT_ORIGINAL_VALUE
        )
    VALUES
        (
            :ARTEFACT_ID,
            :ASSIGNMENT_ID,
            :ARTEFACT_VALUE_ID,
            :ARTEFACT_STRING_VALUE,
            :ARTEFACT_ORIGINAL_VALUE
        )
`

module.exports = sql