const tslgLogger = require('../../../utils/logger');

class Database {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    artefacts = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        const model = variables.model;

        tslgLogger.info(`Добавление артефактов для модели ${model}`, 'ДобавлениеАртефактовБД', {
            modelId: model,
            taskId: task.id
        });

        try {
            const artefacts = [];
            const attr_list = JSON.parse(variables.attr_list);

            tslgLogger.info(`Список артефактов для добавления: ${JSON.stringify(attr_list)}`, 'ОбработкаАртефактов', {
                modelId: model,
                artefactsCount: Object.keys(attr_list).length
            });

            for (let i in attr_list) {
                const artefactId = await this.db
                    .integration
                    .artefactId(i)
                    .then(d => d.rows[0].ARTEFACT_ID);

                artefacts.push({
                    ARTEFACT_ID: artefactId,
                    ARTEFACT_VALUE_ID: null,
                    ARTEFACT_STRING_VALUE: attr_list[i]
                });

                await this.db.artefact.update({
                    MODEL_ID: model,
                    ARTEFACT_IDS: [artefactId]
                });
            }

            await this.db.artefact.add({
                MODEL_ID: model,
                ARTEFACTS: artefacts
            });

            await taskService.complete(task);

            tslgLogger.info(`Артефакты успешно добавлены для модели ${model}`, 'УспехДобавленияАртефактовБД', {
                modelId: model,
                artefactsCount: artefacts.length,
                taskId: task.id
            });

        } catch (error) {
            tslgLogger.error(`Ошибка добавления артефактов для модели ${model}`, 'ОшибкаДобавленияАртефактовБД', error, {
                modelId: model,
                taskId: task.id
            });
            throw error;
        }
    }
}

module.exports = Database;