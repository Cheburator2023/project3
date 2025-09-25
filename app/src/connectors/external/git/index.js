const { Variables } = require("camunda-external-task-client-js");
const tslgLogger = require('../../../utils/logger');

class Git {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    firstValidationLinks = async ({ task, taskService }) => {
        const variables = task.variables.getAll();

        tslgLogger.info(`Получение ссылок на валидацию для модели`, 'ПолучениеСсылокВалидации', {
            modelId: variables.model,
            taskId: task.id
        });

        try {
            const model_entity = await this.db
                .integration
                .modelGet(variables.model)
                .then(d => d.rows[0]);

            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;
            const processVariables = new Variables();

            tslgLogger.info(`Поиск ссылок для модели: ${alias}`, 'ПоискСсылокGit', {
                modelId: variables.model,
                alias,
                files: {
                    report: variables.first_auto_validation_report,
                    result: variables.first_auto_validation_result
                }
            });

            const first_auto_validation_report = await this.integration
                .git
                .getFileLink({model: alias, name: variables.first_auto_validation_report})

            const first_auto_validation_result = await this.integration
                .git
                .getFileLink({model: alias, name: variables.first_auto_validation_result})

            processVariables.setAll({
                first_auto_validation_report: first_auto_validation_report.file_link,
                first_auto_validation_result: first_auto_validation_result.file_link
            });

            await taskService.complete(task, processVariables);

            tslgLogger.info(`Ссылки на валидацию получены для модели: ${alias}`, 'УспехПолученияСсылок', {
                modelId: variables.model,
                alias,
                reportLink: first_auto_validation_report.file_link,
                resultLink: first_auto_validation_result.file_link
            });

        } catch (error) {
            tslgLogger.error(`Ошибка получения ссылок на валидацию для модели`, 'ОшибкаПолученияСсылок', error, {
                modelId: variables.model,
                taskId: task.id
            });
            throw error;
        }
    }
}

module.exports = Git;