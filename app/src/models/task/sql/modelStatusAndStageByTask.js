const sql = `
  SELECT
    *
  FROM
    model_status_stage_to_task_map
  WHERE
    task_id = :task_id
    AND process_key = :key
    AND version_tag = :version_tag
`;

module.exports = sql;
