const sql = `
    SELECT 
        t1.*,
        t2.MODEL_VERSION as PARENT_MODEL_VERSION
    FROM MODELS t1
    INNER JOIN
        MODELS t2
    ON 
        t1.ROOT_MODEL_ID = t2.ROOT_MODEL_ID
    WHERE
        t1.MODEL_ID = :PARENT_MODEL_ID
    ORDER BY
        t2.MODEL_VERSION
`

module.exports = sql