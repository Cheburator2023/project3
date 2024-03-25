const sql = `
    SELECT * FROM ASSIGNMENT
    WHERE ROOT_ASSIGNMENT_ID = :ROOT_ASSIGNMENT_ID
`

module.exports = sql
