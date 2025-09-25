const { Variables } = require("camunda-external-task-client-js");
const tslgLogger = require('../../../utils/logger');

class Jira {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    issue = async ({task, taskService}) => {
        const variables = task.variables.getAll();

        tslgLogger.info(`Создание Jira issue для модели`, 'СозданиеJiraIssue', {
            modelId: variables.model,
            stage: variables.stage,
            taskId: task.id
        });

        try {
            const model_entity = await this.db
                .integration
                .modelGet(variables.model)
                .then(d => d.rows[0]);

            const key = "key";
            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;
            const story_summary = `${variables.stage} for ${alias} ${new Date().toUTCString()}`;
            const story_description = `Description for ${story_summary}`;

            tslgLogger.info(`Создание Jira issue для модели ${alias}, задача: ${variables.stage}`, 'ПодготовкаJiraIssue', {
                modelId: variables.model,
                alias,
                storySummary: story_summary
            });

            const external_links = [];
            const external_links_obj = JSON.parse(variables.external_links_list);
            for (let i in external_links_obj) {
                if (external_links_obj[i] == undefined || external_links_obj[i] == null || external_links_obj[i] == "null" || external_links_obj[i] == "") {
                    external_links.push(i);
                } else {
                    external_links.push(external_links_obj[i]);
                }
            }

            const links = [variables.criterion_file];
            const links_obj = JSON.parse(variables.links_list);
            for (let i in links_obj) {
                if (links_obj[i] == undefined || links_obj[i] == null || links_obj[i] == "null" || links_obj[i] == "") {
                    links.push(i);
                } else {
                    links.push(links_obj[i]);
                }
            }

            const jiraResponse = await this.integration
                .jira
                .issue(key, alias, {
                    epic_description: Buffer.from(model_entity.MODEL_DESC).toString('utf-8'),
                    story_summary: Buffer.from(story_summary).toString('utf-8'),
                    story_description: Buffer.from(story_description).toString('utf-8'),
                    links,
                    external_links,
                    estimated_time: variables.estimated_time
                });

            const jira_msg = JSON.stringify(jiraResponse.message);
            tslgLogger.info(`Jira Response: ${jira_msg}`, 'ОтветJira', {
                modelId: variables.model,
                alias,
                status: jiraResponse.status
            });

            await this.db
                .integration
                .jiraAdd(jira_msg, task.processInstanceId, jiraResponse.status, alias, story_summary);

            tslgLogger.info(`Jira issue создан: ${story_summary}`, 'УспехСозданияJiraIssue', {
                modelId: variables.model,
                alias,
                storySummary: story_summary,
                taskId: task.id
            });

            await taskService.complete(task);

        } catch (error) {
            tslgLogger.error(`Ошибка создания Jira issue для модели`, 'ОшибкаСозданияJiraIssue', error, {
                modelId: variables.model,
                taskId: task.id
            });
            throw error;
        }
    }

    status = async ({ task, taskService }) => {
        tslgLogger.info("Проверка статуса JIRA", 'ПроверкаСтатусаJira', {
            processInstanceId: task.processInstanceId,
            taskId: task.id
        });

        try {
            const jiraReponse = await this.db
                .integration
                .jiraGet(task.processInstanceId)
                .then(d => d.rows[0]);

            const jiraData = JSON.parse(jiraReponse.JIRA_RESPONSE);
            const status = await this.integration
                .jira
                .status(jiraData.key);

            tslgLogger.info(`Статус JIRA: ${JSON.stringify(status)}`, 'СтатусJira', {
                processInstanceId: task.processInstanceId,
                jiraKey: jiraData.key,
                status: status.story_status
            });

            const processVariables = new Variables();
            let camundaStatus = "Default";

            if (status && status.story_status) {
                if (status.story_status.toLowerCase() == "created" || status.story_status.toLowerCase() == "создано") {
                    camundaStatus = "Created";
                }
                if (status.story_status.toLowerCase() == "closed" || status.story_status.toLowerCase() == "закрыто") {
                    if (status.story_resolution.toLowerCase() == "done" || status.story_resolution.toLowerCase() == "готово" || status.story_resolution.toLowerCase() == "выполнено") {
                        camundaStatus = "Closed";
                    }
                    if (status.story_resolution.toLowerCase() == "rejected" || status.story_resolution.toLowerCase() == "отклонено") {
                        camundaStatus = "Canceled";
                    }
                }
            }

            processVariables.setAll({
                status: camundaStatus
            });

            await taskService.complete(task, processVariables);

            tslgLogger.info(`Статус Camunda установлен: ${camundaStatus}`, 'УстановкаСтатусаCamunda', {
                processInstanceId: task.processInstanceId,
                jiraKey: jiraData.key,
                camundaStatus
            });

        } catch (error) {
            tslgLogger.error("Ошибка проверки статуса JIRA", 'ОшибкаПроверкиСтатусаJira', error, {
                processInstanceId: task.processInstanceId,
                taskId: task.id
            });
            throw error;
        }
    }
}

module.exports = Jira;