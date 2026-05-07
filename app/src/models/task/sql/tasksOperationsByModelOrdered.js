const sql = `
  SELECT 
    tol.task_id, tol.task_id_rolled_back_from, tol.operation, tol.create_date
  FROM 
    tasks_operations_logs tol
  WHERE 
    tol.model_id = :model_id
  ORDER BY 
    tol.create_date ASC
`;

module.exports = sql;
