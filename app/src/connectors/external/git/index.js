const { Variables } = require("camunda-external-task-client-js");

class Git {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    firstValidationLinks = async ({ task, taskService }) => {
        try{
            const variables  = task.variables.getAll()
            const model_entity = await this.db
                .integration
                .modelGet(variables.model)
                .then(d => d.rows[0])
            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`
            const processVariables = new Variables();
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
            await taskService.complete(task, processVariables)           
        }
        catch(e){
            console.sys(e)
        }
    }
}

module.exports = Git