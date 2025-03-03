/*
  Возвращает карточку :type_ по :ROOT_MODEL_ID и :MODEL_VERSION
*/

const status = require("./status");
const activeBpmnInstance = require("./getActiveBpmnInstance");
const main = require("./main");
const automl = require("./automl");

const sql = `
  WITH model AS (
    SELECT
        root_model_id,
        model_id,
        model_name,
        model_desc,
        model_version,
        model_creator,
        create_date,
        update_author,
        bpmn_instance_id,
        parent_model_id,
        models_is_active_flg,
        deployment_id,
        model_status,
        model_stage
    FROM
        models
    WHERE
        models.root_model_id = :root_model_id
        AND models.model_version = :model_version
  )
  SELECT
      model.*,
      automl.*,
      st.status,
      activeBpmnInstance.bpmn_instance_name,
      mt.update_date,
      mt.department_value,
      mt.business_customer_departament,
      mt.mipm_value
  FROM
      model
  LEFT JOIN
      (${automl}) automl
      ON automl.automl_model_id = model.model_id
  LEFT JOIN
      (${status}) st
      ON st.model_id = model.model_id
  LEFT JOIN
      (${activeBpmnInstance}) activeBpmnInstance
      ON activeBpmnInstance.model_id = model.model_id
  LEFT JOIN
      (${main}) mt
      ON mt.model_id = model.model_id
  WHERE model.model_id IN (
      WITH bi AS (
          SELECT
              model_id,
              bpmn_key_id
          FROM
              bpmn_instances
          WHERE model_id IN (SELECT model_id FROM model)
      )
      SELECT
          model_id
      FROM
          bi
      INNER JOIN
          bpmn_processes
          ON bpmn_processes.bpmn_key_id = bi.bpmn_key_id
      WHERE bpmn_processes.bpmn_key_desc = ANY (:type::text[])
  )
`;

module.exports = sql;
