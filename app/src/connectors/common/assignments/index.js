const sql = require('./sql');

class AssignmentsService {
  constructor(database) {
    this.database = database;
  }
  
  async deleteAssignment(rootAssignmentId) {
    await this.database.execute({
      sql: sql.deleteAssignment,
      args: {
        root_assignment_id: rootAssignmentId,
      }
    });
  }
}

module.exports = AssignmentsService;
