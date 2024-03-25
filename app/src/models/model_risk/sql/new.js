const sql = `
    INSERT INTO M_COEFFICIENT 
        (AUTHOR, VALUE)
    VALUES 
        (:AUTHOR, :VALUE)
`

module.exports = sql
