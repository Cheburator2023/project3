const sql = `
    SELECT DISTINCT
        FUNCTIONAL_ROLE as "group",
        ASSIGNEE_NAME as "id",
        ASSIGNEE_NAME as "username"
    FROM 
        assignee_hist
    WHERE 
        FUNCTIONAL_ROLE = :group_name
`

module.exports = sql