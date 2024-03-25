const sql = `
    INSERT INTO TASKS_OPERATIONS_LOGS (
        ID,
        MODEL_ID,
        TASK_ID,
        OPERATION,
        USER_NAME,
        TASK_ID_ROLLED_BACK_FROM,
        CREATE_DATE
    ) VALUES (
        nextval('tasks_operations_logs_seq'),
        :MODEL_ID,
        :TASK_ID,
        :OPERATION,
        :USER_NAME,
        :ROLLED_BACK_FROM,
        (SELECT CURRENT_TIMESTAMP)
    )
`;

module.exports = sql;
