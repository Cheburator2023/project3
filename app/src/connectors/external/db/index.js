class Database {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    artefacts = async ({ task, taskService }) => {
        try{
            const variables  = task.variables.getAll()
            const model = variables.model
            const artefacts = []
            const attr_list = JSON.parse(variables.attr_list)
            console.sys(`Add artefacts for model ${model}`)
            console.sys(attr_list)
            for (let i in attr_list){
                const artefactId = await this.db
                                        .integration
                                        .artefactId(i)
                                        .then(d => d.rows[0].ARTEFACT_ID)
                artefacts.push({ARTEFACT_ID: artefactId, ARTEFACT_VALUE_ID: null, ARTEFACT_STRING_VALUE: attr_list[i]})
                await this.db.artefact.update({
                    MODEL_ID: model,
                    ARTEFACT_IDS: [artefactId]
                })
            }
            await this.db
                .artefact
                .add({MODEL_ID: model, ARTEFACTS: artefacts})
        }
        catch(e){
            console.sys(e)
        }
        await taskService.complete(task)
    }
}

module.exports = Database
