const sql = `
    with row as (
        INSERT INTO ROOT_ASSIGNMENT
            (
                 STATUS,
                 END_DATE,
                 END_EVENT
            )
        VALUES
            (
                'Открыто',
                TO_DATE(:END_DATE, 'YYYY-MM-DD'),
                :END_EVENT
            )
        returning ID
    )
    SELECT ID from row
`
module.exports = sql
