const sql = `
  SELECT
      functional_role AS "role",
      lead_name       AS "lead",
      assignee_name   AS "username",
      model_id
  FROM
      assignee_hist
  WHERE
      model_id = ANY (:models::text[])
      AND effective_to = to_timestamp('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
`

module.exports = sql
