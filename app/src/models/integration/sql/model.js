const sql = `
    SELECT * 
    FROM 
        MODELS 
    WHERE 
        MODEL_ID=:MODEL_ID
`

module.exports = sql
