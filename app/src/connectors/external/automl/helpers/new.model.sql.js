const sql = `
    INSERT INTO MODELS
        (
            MODEL_ID,
            MODEL_NAME,
            ROOT_MODEL_ID
        )
    VALUES
        (
            :MODEL_ID,
            :MODEL_NAME,
            MODELS_SEQ.nextval
        )
`

module.exports = sql
