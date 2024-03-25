const sql = `
    SELECT * 
    FROM 
        JIRA_ISSUE 
    WHERE 
        INSTANCE_ID=:INSTANCE_ID ORDER BY INSERT_TIMESTAMP DESC
`

module.exports = sql
