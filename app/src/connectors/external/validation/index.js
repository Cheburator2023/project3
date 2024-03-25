const fetch = require('isomorphic-fetch')
const { Variables } = require("camunda-external-task-client-js");

const host = "http://oraca.eastus2.cloudapp.azure.com:5000/"

class Validation {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    validation = async ({ task, taskService }) => {
        try{
            const processVariables = new Variables()
            const variables  = task.variables.getAll()
            const model_entity = await this.db
                .integration
                .modelGet(variables.model)
                .then(d => d.rows[0])
            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`
            console.sys(`Validation process for ${alias}`)
            let risk_scale_id = null
            let risk_scale = ''
            if (variables.risk_scale_flg == "Да") {
                risk_scale_id = await this.db
                    .card
                    .risk(variables.model)
                    .then(d => d[0].ROOT_RISK_SCALE_ID)
                    .catch(async function(e){
                        console.sys(e)
                        processVariables.setAll({
                            risk_scale_exist_flg: "no"
                            });
                        await taskService.complete(task, processVariables)
                        return null
                })
                if (risk_scale_id == null) 
                    return
                risk_scale = await this.db
                    .risk_scale
                    .rank({ROOT_RISK_SCALE_ID: risk_scale_id})
                    .then(d => d)
            }
            const res = await this.integration
                .teamcity
                .validation({
                    alias, 
                    ID: variables.model, 
                    messageName: "validation_result", 
                    processInstanceId: task.processInstanceId,
                    df_pth_val: this.getFilename(variables.first_validation_data),
                    df_pth_dev: this.getFilename(variables.first_validation_data_developing),
                    config: this.getFilename(variables.first_validation_config),
                    scale: JSON.stringify(risk_scale),
                    path_out: 'first_auto_validation_report.xlsx',
                })
            processVariables.setAll({
                start_validation: new Date().toUTCString(),
                risk_scale_exist_flg: "yes"
                });
            await taskService.complete(task, processVariables)
        }
        catch(e){
            console.sys(e)
        }
    }

    getFilename = str => {
        return str.split('/').slice(-1)[0].split('?')[0]
    }
}

module.exports = Validation