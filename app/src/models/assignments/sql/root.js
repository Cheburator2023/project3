const sql = `
  SELECT *
  FROM ROOT_ASSIGNMENT
  WHERE ID = :ROOT_ASSIGNMENT_ID
`

module.exports = sql
