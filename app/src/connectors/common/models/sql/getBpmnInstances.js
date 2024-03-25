const sql = `
  SELECT
      bpmn_instance_id
  FROM
      bpmn_instances
  WHERE
      model_id = :model_id
`;

module.exports = sql;
