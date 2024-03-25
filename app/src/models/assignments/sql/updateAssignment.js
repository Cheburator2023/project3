const sql = `
    with row as (
        UPDATE
            ASSIGNMENT
                SET EFFECTIVE_TO = CURRENT_TIMESTAMP(0)
                WHERE ROOT_ASSIGNMENT_ID = :ROOT_ASSIGNMENT_ID
                    AND EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
        returning ID
    )
    select ID from row
`

module.exports = sql
