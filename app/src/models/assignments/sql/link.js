const sql = `
    INSERT INTO ASSIGNMENT_X_MODEL
        (
            ROOT_ASSIGNMENT_ID,
            MODEL_ID
        )
    VALUES
        (
            :ROOT_ASSIGNMENT_ID,
            :MODEL_ID
        )
`

module.exports = sql
