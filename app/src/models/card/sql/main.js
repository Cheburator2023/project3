const sql = `
  SELECT
      m.model_id,
      m.root_model_id,
      m.model_name,
      m.model_desc,
      m.model_version,
      m.create_date AS create_date,
      m_upd_date.update_date AS update_date,
      m.update_author,
      m.parent_model_id,
      MAX(
          CASE
              WHEN ar.artefact_id = 6
                  THEN av.artefact_value
              ELSE NULL
          END
      ) AS business_customer_departament,
      MAX(
          CASE
              WHEN ar.artefact_id = 7
                  THEN av.artefact_value
              ELSE NULL
          END
      ) AS department_value,
      MAX(
          CASE
              WHEN ar.artefact_id = 83
                  THEN ar.artefact_string_value
              ELSE NULL
          END
      ) AS mipm_value
  FROM
      models m
      INNER JOIN
          artefact_realizations ar
          ON m.model_id = ar.model_id
              AND ar.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
              AND ar.artefact_id IN ( 6, 7, 83 )
      INNER JOIN
          artefacts a
          ON ar.artefact_id = a.artefact_id
      LEFT JOIN
          artefact_x_type axt
          ON a.artefact_type_id = axt.artefact_type_id
      LEFT JOIN
          artefact_values av
          ON ar.artefact_id = av.artefact_id
              AND ar.artefact_value_id = av.artefact_value_id
      LEFT JOIN (
          SELECT
              u_m.model_id,
              MAX(u_m.effective_from) AS update_date
          FROM (
              SELECT
                  model_id,
                  effective_from
              FROM
                  artefact_realizations
              UNION ALL
              SELECT
                  model_id,
                  effective_from
              FROM
                  bpmn_instances
          ) u_m
          GROUP BY u_m.model_id
      ) m_upd_date ON m.model_id = m_upd_date.model_id
  WHERE ( :is_ds_flg = '1' AND m.model_id IN (
      SELECT DISTINCT
          m_tmp.model_id
      FROM
          models m_tmp
      INNER JOIN
          artefact_realizations ar
          ON m_tmp.model_id = ar.model_id
              AND ar.artefact_id = 7
              AND ar.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
      INNER JOIN
          artefacts a
          ON ar.artefact_id = a.artefact_id
      INNER JOIN
          artefact_values av
          ON av.artefact_id = ar.artefact_id
              AND av.artefact_value_id = ar.artefact_value_id
              AND av.artefact_value = ANY (:groups::text[])
  )) OR ( :is_bc_flg = '1' AND m.model_id IN (
      SELECT DISTINCT
          m_tmp.model_id
      FROM
          models m_tmp
      INNER JOIN
          artefact_realizations ar
          ON m_tmp.model_id = ar.model_id
              AND ar.artefact_id = 6
              AND ar.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
      INNER JOIN
          artefacts a
          ON ar.artefact_id = a.artefact_id
      INNER JOIN
          artefact_values av
          ON av.artefact_id = ar.artefact_id
              AND av.artefact_value_id = ar.artefact_value_id
              AND av.artefact_value = ANY (:groups::text[])
  )) OR ( :is_bc_flg = '0' AND :is_ds_flg = '0' )
  GROUP BY
      m.model_id,
      m.root_model_id,
      m.model_name,
      m.model_desc,
      m.model_version,
      m.create_date,
      m_upd_date.update_date,
      m.update_author,
      m.parent_model_id
  ORDER BY
      m.model_id
`;

module.exports = sql;
