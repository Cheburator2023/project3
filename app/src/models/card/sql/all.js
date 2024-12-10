/*
  Возвращает определнный реестр
  :business_customer - бизнес-заказчик. Если поле null, то фильтрации не происходит, иначе выводит только инфу по моделям, которые "сопряжены" с данным бизнес-заказчиком
*/
const status = require("./status");
const activeBpmnInstance = require("./getActiveBpmnInstance");
const main = require("./main");
const automl = require("./automl");

const sql = `
  SELECT
      AUTOML.*,
      t1.ROOT_MODEL_ID,
      t1.MODEL_ID,
      t1.MODEL_NAME,
      t1.MODEL_DESC,
      t1.MODEL_VERSION,
      t1.CREATE_DATE,
      t1.UPDATE_AUTHOR,
      t1.BPMN_INSTANCE_ID,
      t1.PARENT_MODEL_ID,
      t1.MIPM,
      t1.MODELS_IS_ACTIVE_FLG,
      ST.status,
      activeBpmnInstance.bpmn_instance_name,
      MT.UPDATE_DATE,
      MT.DEPARTMENT_VALUE,
      MT.MIPM_VALUE,
      DEPLOYMENTS.DEPLOYMENT_ID
  FROM
      MODELS t1
  LEFT JOIN DEPLOYMENTS
      ON t1.DEPLOYMENT_ID = DEPLOYMENTS.DEPLOYMENT_ID
  LEFT JOIN (${automl}) AUTOML
      ON t1.MODEL_ID = AUTOML.automl_model_id
  INNER JOIN (
    SELECT DISTINCT
        model_id,
        bpmn_key_id
    FROM
        BPMN_INSTANCES
  ) t2 ON t1.MODEL_ID = t2.MODEL_ID
  INNER JOIN
      BPMN_PROCESSES t3
      ON t3.BPMN_KEY_ID = t2.BPMN_KEY_ID
  LEFT JOIN
      (${status}) ST
      ON t1.MODEL_ID = ST.MODEL_ID
  LEFT JOIN
      (${activeBpmnInstance}) activeBpmnInstance
      ON t1.MODEL_ID = activeBpmnInstance.MODEL_ID
  INNER JOIN
      (${main}) MT
      ON t1.MODEL_ID = MT.MODEL_ID
  WHERE
      t1.MODELS_IS_ACTIVE_FLG = :active
      AND t3.BPMN_KEY_DESC = ANY (:type::text[])
      AND MT.DEPARTMENT_VALUE = ANY (:departments::text[])
  ORDER BY
      t1.CREATE_DATE
`;

module.exports = sql;
