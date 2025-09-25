const scheduler = require('node-schedule');
const rule = new scheduler.RecurrenceRule();
const tslgLogger = require('../../utils/logger');

// your timezone
rule.tz = 'Europe/Moscow';

// Set hour
rule.hour = 09;
// Set minute
rule.minute = 00;
// Set second
rule.second = 00;
// Days of week
rule.dayOfWeek = new scheduler.Range(0,5);

module.exports = async (db, bpmn, integration) => {
    const checkRoleForLeadGroup = role => role?.indexOf('lead') === role.length - 4;

    const getUsers = async () => {
        const users = new Map();

        await db.user.all().then(res => res
            .forEach(({ USERNAME, ROLE, MODEL_ID }) => {
                if (checkRoleForLeadGroup(ROLE)) {
                    const prevUserModels = users.get(USERNAME) ?? [];
                    const newUserModel = {
                        modelId: MODEL_ID,
                        role: ROLE,
                    }

                    users.set(USERNAME, [...prevUserModels, newUserModel]);
                }
            })
        );

        return users;
    }

    const getUsersWithTasks = (usersMap, tasksWithModelInfo) => {
        const newUsersMap = new Map();

        Array.from(usersMap).forEach(([ username, userModels ]) => {
            const userTasks = tasksWithModelInfo.filter(({
                MODEL_ID: taskModelId,
                USER_GROUPS: taskRoles
            }) =>
                userModels.find(({ modelId, role }) => modelId === taskModelId && taskRoles.includes(role))
            );

            if (userTasks.length) {
                newUsersMap.set(username, userTasks);
            }
        });

        return newUsersMap;
    }

    const getTasksWithModelInfo = ({ dbTasks, dbModels, camundaTasks }) =>
        camundaTasks.reduce((tasks, { taskDefinitionKey, processInstanceId }) => {
            const dbTask = dbTasks.find(({ TASK_ID }) => TASK_ID === taskDefinitionKey);
            const dbModel = dbModels.find(({ BPMN_INSTANCE_ID }) => BPMN_INSTANCE_ID === processInstanceId);

            if (dbTask && dbModel) {
                tasks.push({
                    ...dbTask,
                    ...dbModel,
                    USER_GROUPS: dbTask.USER_GROUPS.split(',').map(role => role.trim()),
                })
            }

            return tasks;
        }, []);

    const getUserEmail = async (username) => {
        const userList = await integration.keycloak.getUsersByUsername(username);

        if (userList.length !== 1) {
            return null;
        }

        const userInfo = await integration.keycloak.getUser(userList[0].id);

        return userInfo?.email;
    }

    const getUsersEmails = async (usersWithTasks) =>
        new Map(
            await Promise.all(
                Array.from(usersWithTasks)
                    .map(async ([ username ]) => [ username, await getUserEmail(username) ])

            ).then(res => res.filter(([ _, email ]) => email))
        );

    const getArguments = (camundaTasks) => {
        const bpmnInstancesIdsSet = new Set();
        const tasksIdsSet = new Set();

        camundaTasks.forEach(({ processInstanceId, taskDefinitionKey }) => {
            bpmnInstancesIdsSet.add(processInstanceId);
            tasksIdsSet.add(taskDefinitionKey);
        })

        return {
            bpmnInstancesIds: Array.from(bpmnInstancesIdsSet),
            tasksIds: Array.from(tasksIdsSet),
        }
    }

    return scheduler.scheduleJob(rule, async function () {
        try {
            tslgLogger.sys('Запуск рассылки уведомлений лидам о неразобранных задачах');

            // Get tasks from camunda
            const camundaTasks = await bpmn.allNotAssignedTasks();
            tslgLogger.info(`Получено задач из Camunda: ${camundaTasks.length}`, 'РассылкаУведомлений');

            // Prepare arguments for db requests
            const { tasksIds, bpmnInstancesIds } = getArguments(camundaTasks);

            // Get tasks from db
            const dbTasks = await db.task.tasksByIds(tasksIds);
            tslgLogger.info(`Получено задач из БД: ${dbTasks.length}`, 'РассылкаУведомлений');

            // Get model info
            const dbModels = await db.card.modelsByBpmnIds(bpmnInstancesIds);
            tslgLogger.info(`Получено моделей из БД: ${dbModels.length}`, 'РассылкаУведомлений');

            // Add model information to db task
            const tasksWithModelInfo = getTasksWithModelInfo({ dbTasks, dbModels, camundaTasks });
            tslgLogger.info(`Сформировано задач с информацией о моделях: ${tasksWithModelInfo.length}`, 'РассылкаУведомлений');

            // Get lead users with assigned models
            const usersMap = await getUsers();
            tslgLogger.info(`Найдено лидов: ${usersMap.size}`, 'РассылкаУведомлений');

            // Add tasks to users
            const usersWithTasks = getUsersWithTasks(usersMap, tasksWithModelInfo);
            tslgLogger.info(`Лидов с задачами: ${usersWithTasks.size}`, 'РассылкаУведомлений');

            // Get users emails map
            const usersEmailsMap = await getUsersEmails(usersWithTasks);
            tslgLogger.info(`Лидов с email: ${usersEmailsMap.size}`, 'РассылкаУведомлений');

            // Send email
            Array.from(usersEmailsMap).forEach(([ username, email ]) => {
                const userTasks = usersWithTasks.get(username);
                integration.smtp.email({
                    to: [email],
                    subject: `СУМ. Задачи в работе.`,
                    text_content: userTasks.map(({
                                                     TASK_NAME,
                                                     ROOT_MODEL_ID,
                                                     MODEL_VERSION
                                                 }) =>
                        `Задача: ${TASK_NAME}. Модель: ${ROOT_MODEL_ID}-v${MODEL_VERSION}.`
                    )
                        .join('\r\n')
                });
                tslgLogger.info(`Отправлено уведомление лиду: ${username}`, 'РассылкаУведомлений', {
                    email,
                    tasksCount: userTasks.length
                });
            });

            tslgLogger.sys(`Рассылка уведомлений лидам о неразобранных задачах завершена. Отправлено уведомлений: ${usersEmailsMap.size}`);
        } catch (error) {
            tslgLogger.error('Ошибка при рассылке уведомлений', 'ОшибкаРассылки', error);
        }
    });
}
