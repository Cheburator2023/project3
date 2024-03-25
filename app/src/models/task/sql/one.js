/*
    Получение информации по конкретной задаче,
    а именно информация о модели и мета информации задачи из базы.

    Аргументы:
        * TASK_ID
        * INSTANCE_ID
*/
const main = require('./main');

const sql = `
  SELECT
      t1.*,
      t3.*
  FROM
      models t1
      INNER JOIN bpmn_instances t2
          ON t2.model_id = t1.model_id
              AND t2.bpmn_instance_id = :instance_id
  INNER JOIN
      (${main}) MT
      ON t1.MODEL_ID = mt.model_id
  LEFT JOIN
      tasks t3
      ON t3.task_id = :task_id
`;

module.exports = sql;
