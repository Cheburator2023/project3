const sql = `
    with row as (
        INSERT INTO ASSIGNMENT
            (
                ROOT_ASSIGNMENT_ID
            )
        VALUES
            (
                :ROOT_ASSIGNMENT_ID
            )
        returning ID
    )
    select ID from row
`

module.exports = sql
