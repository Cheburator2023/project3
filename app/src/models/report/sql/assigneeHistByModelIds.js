const sql = `
SELECT M.MODEL_ID,
       M.MODEL_NAME,
       M.ROOT_MODEL_ID,
       M.MODEL_VERSION,
       TO_CHAR(M_UPD_DATE.UPDATE_DATE, 'DD.MM.YYYY HH24:MI:SS') AS UPDATE_DATE,
       STATUS.BPMN_KEY_DESC                                     AS STATUS,
       AH.FUNCTIONAL_ROLE,
       STRING_AGG(AH.ASSIGNEE_NAME, ', ')                          AS ASSIGNEE_NAME
FROM ASSIGNEE_HIST AH
         LEFT JOIN MODELS M
                   ON AH.MODEL_ID = M.MODEL_ID
         LEFT JOIN (
    SELECT U_M.MODEL_ID, MAX(U_M.EFFECTIVE_FROM) AS UPDATE_DATE
    FROM (
             SELECT MODEL_ID, EFFECTIVE_FROM
             FROM ARTEFACT_REALIZATIONS
         ) U_M
    GROUP BY U_M.MODEL_ID
) M_UPD_DATE ON M.MODEL_ID = M_UPD_DATE.MODEL_ID
         LEFT JOIN (
    SELECT *
    FROM (
             SELECT MODEL_ID,
                    BPMN_KEY_DESC,
                    ROW_NUMBER() OVER (
                        PARTITION BY BI.model_id
                        ORDER BY bi.effective_to DESC, bi.effective_from DESC
                        ) AS rn
             FROM BPMN_INSTANCES BI
                      LEFT JOIN BPMN_PROCESSES BP
                                ON BI.BPMN_KEY_ID = BP.BPMN_KEY_ID
                                    AND effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
         ) as dummy
    WHERE rn = 1
) STATUS ON STATUS.MODEL_ID = M.MODEL_ID
WHERE AH.MODEL_ID = ANY(:modelIds::text[])
  AND TO_TIMESTAMP(cast(M_UPD_DATE.UPDATE_DATE as TEXT), 'YYYY-MM-DD HH24:MI:SS') <= TO_DATE(:dateOfDelay, 'YYYY-MM-DD HH24:MI:SS')
  AND BPMN_KEY_DESC IN ('main', 'initialization', 'data', 'data_search', 'data_pilot', 'data_build', 'model',
                        'model_validation', 'integration', 'integration_datamart', 'integration_env_conf',
                        'integration_test', 'integration_user', 'integration_prod', 'cancel')
group by m.MODEL_ID, M.ROOT_MODEL_ID, M.MODEL_VERSION, AH.FUNCTIONAL_ROLE, M.MODEL_NAME, STATUS.BPMN_KEY_DESC,
         M_UPD_DATE.UPDATE_DATE
ORDER BY M_UPD_DATE.UPDATE_DATE desc
`;

module.exports = sql;
