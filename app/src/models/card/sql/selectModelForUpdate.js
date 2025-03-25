const sql = `
    SELECT
        *
    FROM models
    WHERE 
        model_id = :model_id
    FOR UPDATE
`

module.exports = sql