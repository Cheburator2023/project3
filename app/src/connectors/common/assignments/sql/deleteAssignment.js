const sql = `
  BEGIN
      DELETE FROM assignment_artefact_realizations
          WHERE assignment_id IN (
              SELECT DISTINCT
                  assignment_id
              FROM
                  assignment_artefact_realizations
              INNER JOIN assignment
                  ON assignment.id = assignment_artefact_realizations.assignment_id
              WHERE
                  assignment.root_assignment_id = :root_assignment_id
          );
      
      DELETE FROM assignment
          WHERE root_assignment_id = :root_assignment_id;
      
      DELETE FROM assignment_x_model
          WHERE root_assignment_id = :root_assignment_id;
      
      DELETE FROM root_assignment
          WHERE id = :root_assignment_id;
          
      COMMIT WORK;
  END;
`;

module.exports = sql;
