/*
  Получение задач для модели.

  Аргументы:
      * TASK_IDS
      * MODEL_ID
*/
const main = require('./main');

const sql = `
  WITH bi AS (
    SELECT
        model_id,
        bpmn_key_id,
        bpmn_instance_id
    FROM
        bpmn_instances
    WHERE model_id = :MODEL_ID
  )
  SELECT
    bi.*,
    ts.*
  FROM
    bi
  INNER JOIN (
    WITH bi_ids AS (
        SELECT
            unnest AS bpmn_instance_id,
            ordinality AS rn
        FROM unnest(:idxbpmn::text[]) WITH ORDINALITY
    )
    SELECT
        bpmn_instance_id,
        task_id
    FROM
        bi_ids
    INNER JOIN (
        SELECT
            unnest AS task_id,
            ordinality AS rn
        FROM unnest(:tasks::text[]) WITH ORDINALITY
    ) task_ids ON task_ids.rn = bi_ids.rn
  ) bi_fltr ON bi_fltr.bpmn_instance_id = bi.bpmn_instance_id
  INNER JOIN
    tasks ts
    ON ts.task_id = bi_fltr.task_id
  INNER JOIN
    (${main}) mt
    ON mt.model_id = bi.model_id
`;

module.exports = sql;
