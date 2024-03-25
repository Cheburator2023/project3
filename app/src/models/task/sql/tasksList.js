/**
 *  Получение задач пользователя.
 */

const sql = `
  WITH bi AS (
    SELECT
        bpmn_instance_id,
        model_id
    FROM
        bpmn_instances
     WHERE bpmn_instance_id = ANY (:idxbpmn::text[])
  )
  SELECT
    bi.bpmn_instance_id AS "BPMN_INSTANCE_ID",
    m.root_model_id AS "ROOT_MODEL_ID",
    m.model_version AS "MODEL_VERSION",
    m.model_name AS "MODEL_NAME",
    m.model_id AS "MODEL_ID"
  FROM
    bi
  INNER JOIN (
    WITH fm AS (
        SELECT
            models.root_model_id,
            models.model_id,
            models.models_is_active_flg,
            models.model_version,
            models.model_name
        FROM
            models
        WHERE
            model_id IN (SELECT model_id FROM bi)
    )
    SELECT
        fm.root_model_id,
        fm.model_id,
        fm.model_version,
        fm.model_name
    FROM
        fm
    WHERE (
        :is_ds_flg = '1' AND fm.model_id IN (
            SELECT DISTINCT
                m_tmp.model_id
            FROM
                fm m_tmp
            INNER JOIN artefact_realizations ar
                ON m_tmp.model_id = ar.model_id
                    AND ar.artefact_id = 7
                    AND ar.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
            INNER JOIN
                artefacts a
                ON ar.artefact_id = a.artefact_id
            INNER JOIN artefact_values av
                ON av.artefact_id = ar.artefact_id
                    AND av.artefact_value_id = ar.artefact_value_id
                    AND av.artefact_value = ANY (:groups::text[])
            WHERE
                m_tmp.models_is_active_flg = '1'
        )
    ) OR (
        :is_ds_flg = '0' AND fm.models_is_active_flg = '1'
    )
  ) m ON m.MODEL_ID = bi.model_id
`;

module.exports = sql;
