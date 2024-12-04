const sql = `
    UPDATE 
        models
    SET
        model_stage = :model_stage
    WHERE
        model_id = :model_id
`

module.exports = sql