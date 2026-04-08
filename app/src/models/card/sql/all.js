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
      modelStatusHist.status AS MODEL_STATUS,
      modelStageHist.active_stage AS MODEL_STAGE,
      ST.status,
      activeBpmnInstance.bpmn_instance_name,
      MT.UPDATE_DATE,
      MT.DEPARTMENT_VALUE,
      MT.MIPM_VALUE,
      DEPLOYMENTS.DEPLOYMENT_ID
  FROM
      MODELS t1
  LEFT JOIN (
    SELECT DISTINCT ON (model_id)
        model_id,
        status
    FROM model_status
    WHERE effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
    ORDER BY model_id, effective_from DESC
  ) AS modelStatusHist
      ON t1.MODEL_ID = modelStatusHist.model_id
  LEFT JOIN (
    SELECT
        model_id,
        ARRAY_TO_STRING(ARRAY_AGG(stage ORDER BY effective_from DESC), ';') AS active_stage
    FROM model_stage
    WHERE effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
    GROUP BY model_id
  ) AS modelStageHist
      ON t1.MODEL_ID = modelStageHist.model_id
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
  ORDER BY
      t1.CREATE_DATE
`;

module.exports = sql;
