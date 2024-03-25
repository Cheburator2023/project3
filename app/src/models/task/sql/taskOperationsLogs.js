const sql = `
  SELECT
    t1.*,
    t2.TASK_NAME,
    t3.TASK_NAME as TASK_NAME_ROLLED_BACK_FROM
  FROM
    TASKS_OPERATIONS_LOGS t1
  INNER JOIN
    TASKS t2
  ON
    t1.TASK_ID = t2.TASK_ID
  LEFT JOIN
    TASKS t3
  ON
    t1.TASK_ID_ROLLED_BACK_FROM = t3.TASK_ID
  WHERE
    t1.MODEL_ID = :modelId
  AND
    t1.TASK_ID= :taskId
`;

module.exports = sql;
