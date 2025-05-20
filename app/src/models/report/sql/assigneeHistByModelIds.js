const sql = `
SELECT 
  M.MODEL_ID,
  M.MODEL_NAME,
  M.ROOT_MODEL_ID,
  M.MODEL_VERSION,
  TO_CHAR(M_UPD_DATE.UPDATE_DATE, 'DD.MM.YYYY HH24:MI:SS') AS UPDATE_DATE,
  COALESCE(M.MODEL_STAGE, BP.BPMN_KEY_DESC) AS STATUS,
  AH.FUNCTIONAL_ROLE,
  AH.ASSIGNEE_NAME,
  BI.BPMN_INSTANCE_ID
FROM ASSIGNEE_HIST AH
LEFT JOIN MODELS M ON AH.MODEL_ID = M.MODEL_ID
LEFT JOIN (
  SELECT MODEL_ID, MAX(EFFECTIVE_FROM) AS UPDATE_DATE
  FROM ARTEFACT_REALIZATIONS
  GROUP BY MODEL_ID
) M_UPD_DATE ON M.MODEL_ID = M_UPD_DATE.MODEL_ID
LEFT JOIN BPMN_INSTANCES BI 
  ON BI.MODEL_ID = M.MODEL_ID
  AND BI.EFFECTIVE_TO = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
LEFT JOIN BPMN_PROCESSES BP 
  ON BI.BPMN_KEY_ID = BP.BPMN_KEY_ID
WHERE AH.MODEL_ID = ANY(:modelIds::text[])
  AND (
    :dateOfDelay::text IS NULL OR 
    TO_TIMESTAMP(CAST(M_UPD_DATE.UPDATE_DATE AS TEXT), 'YYYY-MM-DD HH24:MI:SS') 
        <= TO_DATE(:dateOfDelay::text, 'YYYY-MM-DD HH24:MI:SS')
  )
  AND BP.BPMN_KEY_DESC IN (
    'main', 'initialization', 'data', 'data_search', 'data_pilot', 'data_build', 'model',
    'model_validation', 'integration', 'integration_datamart', 'integration_env_conf',
    'integration_test', 'integration_user', 'integration_prod', 'monitoring', 
    'monitoring_auto_correct', 'validation', 'removal', 'cancel', 'rollback_version', 
    'rollback', 'jira', 'fast_model_process', 'model_pilot', 'fullvalidation_datamart', 
    'inegration_model', 'test_preprod_transfer_prod', 'fullvalidation', 'model_state_transition'
  )
ORDER BY M_UPD_DATE.UPDATE_DATE DESC;
`;

module.exports = sql;
