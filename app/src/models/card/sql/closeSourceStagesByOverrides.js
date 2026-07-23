const sql = `
    UPDATE model_stage_source
    SET effective_to = current_timestamp(0)
    WHERE model_id = :model_id 
      AND effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
      AND id IN (
        SELECT mso.source_record_id
        FROM model_stage_override mso
        WHERE mso.model_id = :model_id 
          AND mso.source_record_id IS NOT NULL
          AND mso.is_final_override = false
      );
`;

module.exports = sql;