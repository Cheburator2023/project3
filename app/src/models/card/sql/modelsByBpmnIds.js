/**
 *  Получение информации о модели по bpmn_instance_id.
 */

const sql = `
    SELECT
        bi.bpmn_instance_id,
        m.root_model_id,
        m.model_id,
        m.model_version,
        m.model_name
    FROM bpmn_instances bi
        INNER JOIN models m
            ON bi.MODEL_ID = m.MODEL_ID
    WHERE bi.bpmn_instance_id = ANY (:bpmnInstancesIds::text[])
`;

module.exports = sql;
