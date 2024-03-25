const sql = `
    SELECT
        FUNCTIONAL_ROLE as "role",
        LEAD_NAME as "lead",
        ASSIGNEE_NAME as "username",
        MODEL_ID
    FROM 
        assignee_hist 
    WHERE
        effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
`

module.exports = sql