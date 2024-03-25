const sql = `
    SELECT
        t1.*,
        t2.*,
        t3.*,
        t1.ARTEFACT_ID,
        t3.ARTEFACT_TYPE_ID
    FROM
        ARTEFACTS t1
    INNER JOIN
        ARTEFACT_VALUES t2
    ON
        t1.ARTEFACT_ID = t2.ARTEFACT_ID
    AND 
        t2.IS_ACTIVE_FLG = '1'
    INNER JOIN
        ARTEFACT_X_TYPE t3
    ON
        t1.ARTEFACT_TYPE_ID = t3.ARTEFACT_TYPE_ID
    WHERE
        t1.IS_CLASS_FLG = '1'
    ORDER BY
        t1.ARTEFACT_ID,
        t2.ARTEFACT_VALUE_ID
`

module.exports = sql