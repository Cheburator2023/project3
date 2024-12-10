const { check } = require("../../../models/instance/sql")
const moment = require('moment')

class System{
    constructor(db, bpmn){
        this.bpmn = bpmn
        this.db = db
    }

    endEvent = async ({ task, taskService }) => {
        try{
            console.log("Remove parallel call activity")
            const instance = task.variables.get("instance")
            const processInstances = await this.bpmn.processInstances()
            const process = processInstances.find(i => i.rootProcessInstanceId == instance && (i.processDefinitionKey=="monitoring" || i.processDefinitionKey=="validation"))
            console.log(JSON.stringify(process))
            await this.bpmn.deleteProcess(process.id)
        }
        catch(e){console.log(e)}
        await taskService.complete(task)
    }

    cancel = async ({ task, taskService }) => {
        console.info('Отмена разработки модели')
        const model = task.variables.get("model")

        /* Get all instance for model */
        const instances = await this.db.instance.model({ model })
        /* Завершение всех  */
        console.info('Завершение всех инстансов модели', model)
        await Promise.all(instances.map(
            inst => this.bpmn.deleteProcess(inst.BPMN_INSTANCE_ID)
        ))
        await this.db.card.cancel({ model })

        await taskService.complete(task)
    }

    bpmnStart = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys('Инициализация Бизнес процесса')
        try{
            const checlInstance = await this.db.instance
                .id(variables.instance)

            if (checlInstance) {
                await taskService.complete(task)
                return
            }
            
            await this.db.instance.key({ model: variables.model, key: variables.key })
            await this.db.instance
                .new({ 
                    model: variables.model, 
                    instance: variables.instance, 
                    key: variables.key 
                })
            await taskService.complete(task)
            await this.db.card.addStage({
                modelId: variables.model,
                modelStage: variables.model_stage,
            })
            if ('model_status' in variables) {
                await this.db.card.changeStatus({ modelId: variables.model, modelStatus: variables.model_status ? variables.model_status : null })
            }
        }
        catch(e){console.sys(e)}

    }

    bpmnFinish = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys('Завершение Бизнес процесса')
        try{
            await this.db.instance
                .finish({ model: variables.model, 
                    instance: variables.instance, 
                    key: variables.key 
                })
            await taskService.complete(task)
            await this.db.card.removeStage({
                modelId: variables.model,
                modelStage: variables.model_stage,
            })
            if ('model_status' in variables) {
                await this.db.card.changeStatus({ modelId: variables.model, modelStatus: variables.model_status ? variables.model_status : null })
            }
        }
        catch(e){console.sys(e)}

    }

    bpmnStatus = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys('Смена статуса модели')
        try{
            if ('model_status' in variables) {
                await this.db.card.changeStatus({ modelId: variables.model, modelStatus: variables.model_status ? variables.model_status : null })
            }
            await taskService.complete(task)
        }
        catch(e){console.sys(e)}
    }

    putJobDue = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        try{
            const job = await this.bpmn.getJobByProcessInstanceId(variables.instance)
            if (job.length > 0)
                await this.bpmn.putJobDue(job[0].id, moment(variables.date_completing_ds_tests).format("YYYY-MM-DDTHH:mm:ss.000+0000"))
            await taskService.complete(task)
        }
        catch(e){console.sys(e)}
    }
}

module.exports = System