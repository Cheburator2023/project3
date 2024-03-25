const sql = `
    UPDATE ASSIGNMENT_X_MODEL 
    SET 
        EFFECTIVE_TO = CURRENT_TIMESTAMP(0)
    WHERE 
        ROOT_ASSIGNMENT_ID = :ROOT_ASSIGNMENT_ID
`

module.exports = sql
