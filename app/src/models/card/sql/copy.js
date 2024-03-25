const sql = `
    INSERT INTO MODELS
    (
        MODEL_ID,
        MODEL_NAME,
        MODEL_DESC,
        MODEL_CREATOR,
        ROOT_MODEL_ID,
        MODEL_VERSION,
        DEPLOYMENT_ID
    )
    VALUES
    (
        :MODEL_ID,
        :MODEL_NAME,
        :MODEL_DESC,
        :MODEL_CREATOR,
        :ROOT_MODEL_ID,
        :MODEL_VERSION,
        (
            SELECT DEPLOYMENT_ID from (
                select *
                from DEPLOYMENTS
                order by DEPLOYMENT_ID desc
            ) as dummy
            LIMIT 1
        )
    )
`

module.exports = sql
