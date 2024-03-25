const sql = `
    INSERT INTO
    assignee_hist
        (
            MODEL_ID,
            FUNCTIONAL_ROLE,
            LEAD_NAME,
            ASSIGNEE_NAME
        )
    VALUES
        (
            :MODEL_ID,
            :FUNCTIONAL_ROLE,
            :LEAD_NAME,
            :ASSIGNEE_NAME
        )
`

module.exports = sql