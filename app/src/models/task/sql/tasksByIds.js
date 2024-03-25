/**
 *  Получение задач по id.
 */

const sql = `
    SELECT
        task_id,
        task_name,
        user_groups
    FROM
        tasks
    WHERE task_id = ANY (:tasksIds::text[])
`;

module.exports = sql;
