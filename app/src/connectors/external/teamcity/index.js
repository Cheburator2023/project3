class Teamcity {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    main = async ({ task, taskService }) => {
        const variables  = task.variables.getAll()
        const model = variables.model;
        const stage = variables.stage;
        console.sys(`Teamcity model ${stage}`)
        
        try {
            const model_entity = await this.db
                .integration
                .modelGet(model)
                .then(d => d.rows[0])
            console.sys(`Teamcity model ${model}`)
   
            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`
            const status = await this.integration
                .teamcity
                .start({
                    alias, 
                    ID: model, 
                    messageName: "teamcity_status", 
                    processInstanceId: task.processInstanceId, 
                    stage, 
                    lang: variables.model_lang
                })

            console.sys(`${alias} teamcity status ${status}`)
            await taskService.complete(task)
        }
        catch(e){console.sys(e);}    
    }

    publish = async ({task, taskService}) => {
        const variables  = task.variables.getAll()
        const model = variables.model
        console.sys(`Teamcity publish ${model}`)
        
        try {
            const model_entity = await this.db
            .integration
            .modelGet(model)
            .then(d => d.rows[0])
   
            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`
            const status = await this.integration
                .teamcity
                .publish({
                    messageName: "teamcity_publish", 
                    processInstanceId: task.processInstanceId, 
                    alias, 
                    imageSumNexusAddr: Buffer.from(variables.model_image_nexus_link).toString('utf-8'), 
                    ID: model,
                    //dockerCfgBitbucketAddr: variables.doc_rest_service,
                    containerCfgBitbucketAddr: Buffer.from(variables.container_cfg_file).toString('utf-8')
                })
            console.sys(`${alias} teamcity status ${status}`)
            await taskService.complete(task)
        }
        catch(e){console.sys(e);}    
    }
}

module.exports = Teamcity