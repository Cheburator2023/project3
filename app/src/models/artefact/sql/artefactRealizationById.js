const sql = `
  SELECT *
  FROM ARTEFACT_REALIZATIONS
  WHERE MODEL_ID = :modelId
    AND ARTEFACT_ID = :artefactId
    AND EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
`;

module.exports = sql;
