const sql = `
    UPDATE ROOT_ASSIGNMENT SET STATUS = :STATUS WHERE ID = :ID
`

module.exports = sql