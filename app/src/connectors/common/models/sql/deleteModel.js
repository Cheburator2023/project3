const sql = `
  BEGIN
      DELETE FROM assignment_artefact_realizations
          WHERE artefact_string_value IN (
              SELECT
                  concat(concat('model', root_model_id), concat('-v', model_version)) AS artefact_string_value
              FROM models
                  WHERE model_id = :model_id
          );
          
      DELETE FROM assignment_x_model
          WHERE model_id = :model_id;
      
      DELETE FROM assignee_hist
          WHERE model_id = :model_id;
      
      DELETE FROM risk_scale_x_model
          WHERE model_id = :model_id;
      
      DELETE FROM tasks_operations_logs
          WHERE model_id = :model_id;
      
      DELETE FROM artefact_realizations
          WHERE model_id = :model_id;
      
      DELETE FROM bpmn_instances
          WHERE model_id = :model_id;
      
      DELETE FROM models
          WHERE model_id = :model_id;
      
      COMMIT WORK;
  END;
`;

module.exports = sql;
