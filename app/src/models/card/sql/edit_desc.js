const sql = `
    UPDATE 
        MODELS
    SET
        MODEL_DESC = :MODEL_DESC
    WHERE
        MODEL_ID = :MODEL_ID
`

module.exports = sql
