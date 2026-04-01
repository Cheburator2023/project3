const auditClient = require('../../../utils/audit/auditClient');
const tslgLogger = require("../../../utils/logger");

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

        // Отправка аудита: отмена разработки
        auditClient.send('SUMD_CANCELMODEL', 'SUCCESS', {
            modelId: model,
        }).catch(err => {
            tslgLogger.error('Ошибка отправки аудита отмены разработки модели', 'AuditError', err);
        });

        await taskService.complete(task)
    }

    bpmnStart = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys('Инициализация Бизнес процесса')
        try{
            await this.db.instance
                .new({ model: variables.model, 
                    instance: variables.instance, 
                    key: variables.key 
                })
            await taskService.complete(task)
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
        }
        catch(e){console.sys(e)}

    }
}

module.exports = System