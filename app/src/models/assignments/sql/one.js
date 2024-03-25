const sql = `
  SELECT *
  FROM ASSIGNMENT
  WHERE ID = :ASSIGNMENT_ID
`

module.exports = sql
