const sql = `
    SELECT BPMN_KEY_ID
        FROM TASKS_X_BPMN
    WHERE
        TASK_ID = :taskId
`

module.exports = sql