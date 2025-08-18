/*
  Fetch only the specific artefacts that need to be synchronized with SumRM
  This is more efficient than fetching all artefacts and then filtering
*/

const sql = `
  SELECT
      ar.artefact_id,
      ar.model_id,
      ar.artefact_value_id,
      ar.artefact_string_value,
      ar.artefact_original_value,
      ar.creator,
      ar.effective_from,
      ar.effective_to,
      a.artefact_tech_label,
      a.artefact_label,
      a.artefact_desc,
      a.artefact_context,
      a.is_main_info_flg,
      a.is_class_flg,
      a.is_edit_flg,
      a.artefact_type_id,
      a.artefact_business_group_id,
      bg.business_group_label,
      av.artefact_value,
      av.is_active_flg,
      av.artefact_parent_value_id,
      at.artefact_type_desc,
      ab.bpmn_name
  FROM
      artefact_realizations ar
  INNER JOIN
      artefacts a
      ON ar.artefact_id = a.artefact_id
  LEFT JOIN
      business_groups bg
      ON a.artefact_business_group_id = bg.business_group_id
  LEFT JOIN
      artefact_values av
      ON ar.artefact_value_id = av.artefact_value_id
  INNER JOIN
      artefact_x_type at
      ON a.artefact_type_id = at.artefact_type_id
  INNER JOIN
      artefact_x_bpmn ab
      ON ar.artefact_id = ab.artefact_id
  WHERE
      ar.model_id = :model_id
      AND ar.artefact_id = ANY (:artefact_ids::int[])
      AND ar.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
  ORDER BY
      ar.artefact_id,
      av.artefact_value_id
`;

module.exports = sql;
