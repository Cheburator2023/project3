/*
  Классификатор карточки.
*/

const sql = `
  SELECT
      ar_.artefact_id,
      ar_.model_id,
      ar_.artefact_value_id,
      ar_.artefact_string_value,
      ar_.artefact_original_value,
      ar_.creator,
      ar_.effective_from,
      ar_.effective_to,
      a_.artefact_tech_label,
      a_.artefact_label,
      a_.artefact_desc,
      a_.artefact_context,
      a_.is_main_info_flg,
      a_.is_class_flg,
      a_.is_edit_flg,
      a_.artefact_type_id,
      a_.artefact_business_group_id,
      bg_.business_group_label,
      av_.artefact_value,
      av_.is_active_flg,
      av_.artefact_parent_value_id,
      at_.artefact_type_desc,
      ab_.bpmn_name
  FROM
      artefact_realizations ar_
  INNER JOIN
      artefacts       a_
      ON ar_.artefact_id = a_.artefact_id
  LEFT JOIN
      business_groups bg_
      ON a_.artefact_business_group_id = bg_.business_group_id
  LEFT JOIN
      artefact_values av_
      ON ar_.artefact_value_id = av_.artefact_value_id
  INNER JOIN
      artefact_x_type at_
      ON a_.artefact_type_id = at_.artefact_type_id
  INNER JOIN
      artefact_x_bpmn ab_
      ON ar_.artefact_id = ab_.artefact_id
  WHERE
      ar_.model_id = ANY (:models::text[])
      AND (
          ( :is_class_flg = '1' AND a_.is_class_flg = '1' )
          OR ab_.bpmn_name = ANY (:types::text[])
      )
      AND ar_.effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
  ORDER BY
      ar_.artefact_id,
      av_.artefact_value_id
`

module.exports = sql
