const sql = `
    UPDATE
        assignee_hist
    SET
        EFFECTIVE_TO = current_timestamp(0)
    WHERE
        MODEL_ID = :MODEL_ID
    AND
        ASSIGNEE_NAME = :username
    AND
        FUNCTIONAL_ROLE = :role
    AND
        LEAD_NAME = :lead
`

module.exports = sql