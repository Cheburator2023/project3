const sql = `
    SELECT * FROM ASSIGNMENT
    WHERE ROOT_ASSIGNMENT_ID = ANY (:assignmentsIds::int[])
`

module.exports = sql
