const sql = `
    UPDATE 
        models
    SET
        model_status = :model_status
    WHERE
        model_id = :model_id
`

module.exports = sql