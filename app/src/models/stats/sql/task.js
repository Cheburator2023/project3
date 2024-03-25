module.exports = `
    SELECT bp.bpmn_key_desc AS "LABEL",
           COUNT(*)         AS "VALUE"
    FROM (
             SELECT bpmn_instance_id,
                    bpmn_key_id,
                    model_id
             FROM bpmn_instances
             WHERE bpmn_instance_id = ANY (:idxbpmn::text[])
         ) bi
             INNER JOIN bpmn_processes bp ON bi.bpmn_key_id = bp.bpmn_key_id
             INNER JOIN models m ON bi.model_id = m.model_id
        AND m.models_is_active_flg = '1'
    GROUP BY bp.bpmn_key_desc
`
