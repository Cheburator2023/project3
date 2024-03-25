/**
 *  Получение задач для модели.
 */

const main = require('./main');

const sql = `
     SELECT
         bi.*,
         ts.*,
         m.root_model_id,
         m.model_id,
         m.model_name,
         m.model_desc,
         m.model_version,
         m.create_date,
         m.update_date,
         m.update_author,
         m.parent_model_id,
         m.mipm,
         m.models_is_active_flg,
         m.deployment_id,
         m.model_creator
     FROM
         bpmn_instances bi
     INNER JOIN (
         WITH bi_ids AS (
             SELECT
                 unnest AS bpmn_instance_id,
                 ordinality AS rn
             FROM unnest(:bpmnIds::text[]) WITH ORDINALITY
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
             FROM unnest(:tasksIds::text[]) WITH ORDINALITY
         ) task_ids ON task_ids.rn = bi_ids.rn
     ) bi_fltr ON bi_fltr.bpmn_instance_id = bi.bpmn_instance_id
     INNER JOIN
         tasks ts
         ON ts.task_id = bi_fltr.task_id
     INNER JOIN
         (${ main }) mt
         ON mt.model_id = bi.model_id
     INNER JOIN
         models m
         ON m.model_id = bi.model_id
 `;

module.exports = sql;
