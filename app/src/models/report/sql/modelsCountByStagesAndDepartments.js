const sql = `
/*
Запрос для отчета "Список департаментов моделей по этапам БП"
*/

WITH DepartmentsWithBpmn as (
    select bp_.BPMN_KEY_DESC,
           av_.ARTEFACT_VALUE as DEPARTMENT_NAME
    from BPMN_INSTANCES bi_
             inner join bpmn_processes bp_ on bi_.bpmn_key_id = bp_.bpmn_key_id
             inner join ARTEFACT_REALIZATIONS ar_ on (
                bi_.MODEL_ID = ar_.MODEL_ID
            and ar_.ARTEFACT_ID = :artefactId
        )
             inner join ARTEFACT_VALUES av_ on ar_.ARTEFACT_VALUE_ID = av_.ARTEFACT_VALUE_ID
        and av_.ARTEFACT_ID = :artefactId
    where bi_.effective_to = to_timestamp(
            '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
        )
)
SELECT DEPARTMENT_NAME,
       SUM(CASE WHEN BPMN_KEY_DESC = 'main' THEN 1 ELSE 0 END)::int                    as main,
       SUM(CASE WHEN BPMN_KEY_DESC = 'initialization' THEN 1 ELSE 0 END)::int          as initialization,
       SUM(CASE WHEN BPMN_KEY_DESC = 'data' THEN 1 ELSE 0 END)::int                    as data,
       SUM(CASE WHEN BPMN_KEY_DESC = 'data_search' THEN 1 ELSE 0 END)::int             as data_search,
       SUM(CASE WHEN BPMN_KEY_DESC = 'data_pilot' THEN 1 ELSE 0 END)::int              as data_pilot,
       SUM(CASE WHEN BPMN_KEY_DESC = 'data_build' THEN 1 ELSE 0 END)::int              as data_build,
       SUM(CASE WHEN BPMN_KEY_DESC = 'model' THEN 1 ELSE 0 END)::int                   as model,
       SUM(CASE WHEN BPMN_KEY_DESC = 'model_validation' THEN 1 ELSE 0 END)::int        as model_validation,
       SUM(CASE WHEN BPMN_KEY_DESC = 'integration' THEN 1 ELSE 0 END)::int             as integration,
       SUM(CASE WHEN BPMN_KEY_DESC = 'integration_datamart' THEN 1 ELSE 0 END)::int    as integration_datamart,
       SUM(CASE WHEN BPMN_KEY_DESC = 'integration_env_conf' THEN 1 ELSE 0 END)::int    as integration_env_conf,
       SUM(CASE WHEN BPMN_KEY_DESC = 'integration_test' THEN 1 ELSE 0 END)::int        as integration_test,
       SUM(CASE WHEN BPMN_KEY_DESC = 'integration_user' THEN 1 ELSE 0 END)::int        as integration_user,
       SUM(CASE WHEN BPMN_KEY_DESC = 'integration_prod' THEN 1 ELSE 0 END)::int        as integration_prod,
       SUM(CASE WHEN BPMN_KEY_DESC = 'monitoring' THEN 1 ELSE 0 END)::int              as monitoring,
       SUM(CASE WHEN BPMN_KEY_DESC = 'monitoring_auto_correct' THEN 1 ELSE 0 END)::int as monitoring_auto_correct,
       SUM(CASE WHEN BPMN_KEY_DESC = 'validation' THEN 1 ELSE 0 END)::int              as validation,
       SUM(CASE WHEN BPMN_KEY_DESC = 'removal' THEN 1 ELSE 0 END)::int                 as removal,
       SUM(CASE WHEN BPMN_KEY_DESC = 'rollback_version' THEN 1 ELSE 0 END)::int        as rollback_version,
       SUM(CASE WHEN BPMN_KEY_DESC = 'rollback' THEN 1 ELSE 0 END)::int                as rollback,
       SUM(CASE WHEN BPMN_KEY_DESC = 'jira' THEN 1 ELSE 0 END)::int                    as jira,
       SUM(CASE WHEN BPMN_KEY_DESC = 'cancel' THEN 1 ELSE 0 END)::int                  as cancel
FROM DepartmentsWithBpmn
GROUP BY DEPARTMENT_NAME
`;

module.exports = sql;
