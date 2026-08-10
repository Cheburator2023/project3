const sql = `
    UPDATE model_status_override
    SET effective_to = current_timestamp(0), updated_at = current_timestamp(0)
    WHERE model_id = :model_id
        AND is_final_override = false
        AND effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS');
`;

module.exports = sql;