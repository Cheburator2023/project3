const sql = `
    SELECT DISTINCT
        FUNCTIONAL_ROLE as "group",
        ASSIGNEE_NAME as "id",
        ASSIGNEE_NAME as "username"
    FROM 
        assignee_hist
    WHERE 
        (:group_name IS NULL OR :group_name = '' OR FUNCTIONAL_ROLE = :group_name)
        AND effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
`

module.exports = sql