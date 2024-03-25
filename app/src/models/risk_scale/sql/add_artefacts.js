const sql = `
    INSERT INTO RISK_SCALE_ARTEFACT_REALIZATIONS
        (
            ROOT_RISK_SCALE_ID,
            ARTEFACT_ID,
            ARTEFACT_VALUE_ID,
            ARTEFACT_STRING_VALUE,
            ARTEFACT_ORIGINAL_VALUE
        )
    VALUES
        (
            :ROOT_RISK_SCALE_ID,
            :ARTEFACT_ID,
            :ARTEFACT_VALUE_ID,
            :ARTEFACT_STRING_VALUE,
            :ARTEFACT_ORIGINAL_VALUE
        )
`

module.exports = sql
