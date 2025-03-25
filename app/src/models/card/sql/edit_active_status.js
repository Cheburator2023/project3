const sql = `
    UPDATE
        MODELS
    SET
        MODELS_IS_ACTIVE_FLG = :MODELS_IS_ACTIVE_FLG
    WHERE
        MODEL_ID = :MODEL_ID
`;

module.exports = sql;
