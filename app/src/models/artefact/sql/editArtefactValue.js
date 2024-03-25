const sql = `
MERGE INTO artefact_values x
USING 
  (
    SELECT 
      :ARTEFACT_ID as artefact_id, 
      :ARTEFACT_VALUE_ID as artefact_value_id, 
      :ARTEFACT_VALUE as artefact_value,
      :IS_ACTIVE_FLG as is_active_flg,
      :ARTEFACT_PARENT_VALUE_ID as artefact_parent_value_id
    from dual
  ) y
ON (x.artefact_value_id  = y.artefact_value_id)
WHEN MATCHED THEN
    UPDATE SET 
      x.artefact_value = y.artefact_value, 
      x.artefact_parent_value_id = y.artefact_parent_value_id,
      x.is_active_flg = y.is_active_flg
WHEN NOT MATCHED THEN
    INSERT(x.artefact_value_id, x.artefact_value, x.artefact_id, x.is_active_flg, x.artefact_parent_value_id)  
    VALUES(y.artefact_value_id, y.artefact_value, y.artefact_id, y.is_active_flg, y.artefact_parent_value_id)
`

module.exports = sql