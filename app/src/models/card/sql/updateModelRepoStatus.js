const sql = `
    UPDATE 
        models
    SET
        model_repo_is_created = :model_repo_is_created
    WHERE
        model_id = :model_id
`

module.exports = sql