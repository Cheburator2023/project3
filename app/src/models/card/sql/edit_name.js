const sql = `
    UPDATE 
        MODELS
    SET
        MODEL_NAME = :MODEL_NAME
    WHERE
        MODEL_ID = :MODEL_ID
`

module.exports = sql
