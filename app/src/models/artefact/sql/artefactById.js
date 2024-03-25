const sql = `
    SELECT
        t1.*,
        t2.*
    FROM
        ARTEFACTS t1
    INNER JOIN
        ARTEFACT_VALUES t2
    ON
        t2.ARTEFACT_ID = :artefactId
    WHERE
        t1.ARTEFACT_ID = :artefactId
`;

module.exports = sql;
