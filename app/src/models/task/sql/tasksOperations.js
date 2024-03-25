const sql = `
  SELECT
    TASK_ID
  FROM
    TASKS_OPERATIONS_LOGS
  WHERE
    MODEL_ID = :modelId
`;

module.exports = sql;
