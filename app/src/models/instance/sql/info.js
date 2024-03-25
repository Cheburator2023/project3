module.exports = `
    SELECT
        *
    FROM MODELS 
    WHERE 
        MODEL_ID = :processInstanceId
`