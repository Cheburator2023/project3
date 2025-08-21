const { Variables } = require("camunda-external-task-client-js");

class Jira {
    constructor(db, integration) {
        this.db = db
        this.integration = integration
    }

    issue = async ({task, taskService}) => {
        const variables  = task.variables.getAll()

        try{
            const model_entity = await this.db
                .integration
                .modelGet(variables.model)
                .then(d => d.rows[0])
            const key = "key"
            const alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`
            const story_summary = `${variables.stage} for ${alias} ${new Date().toUTCString()}`
            const story_description = `Description for ${story_summary}`

            console.sys(`Create jira issue for model ${alias} task ${variables.stage}`)

            const external_links = []
            const external_links_obj = JSON.parse(variables.external_links_list)
            for (let i in external_links_obj){
                if (external_links_obj[i]==undefined || external_links_obj[i]==null || external_links_obj[i]=="null" || external_links_obj[i]=="")
                    external_links.push(i)
                else
                    external_links.push(external_links_obj[i])
            }

            const links = [variables.criterion_file] 
            const links_obj = JSON.parse(variables.links_list)
            for (let i in links_obj){
                if (links_obj[i]==undefined || links_obj[i]==null || links_obj[i]=="null" || links_obj[i]=="")
                    links.push(i)
                else
                    links.push(links_obj[i])
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
                }, this.context)
            const jira_msg = JSON.stringify(jiraResponse.message)
            console.info(`Jira Response ${jira_msg}`)
            await this.db
                .integration
                .jiraAdd(jira_msg, task.processInstanceId, jiraResponse.status, alias, story_summary)
            console.info(`Create jira issue ${story_summary} is complete`)
            await taskService.complete(task)
        }
        catch(e){console.sys(e);}
       
    }

    status = async ({ task, taskService }) => {
        console.sys("JIRA. Status.")
        const { processInstanceId } = task

        try{
            const jiraReponse = await this.db
                .integration
                .jiraGet(processInstanceId)
                .then(d => d.rows[0])

            const jiraData = JSON.parse(jiraReponse.JIRA_RESPONSE)
            const status = await this.integration
                .jira
                .status(jiraData.key)

            console.sys(status)
            const processVariables = new Variables();
            let camundaStatus = "Default"
            if (status && status.story_status){
                if(status.story_status.toLowerCase() == "created" || status.story_status.toLowerCase() == "создано")  
                    camundaStatus = "Created"     
                if(status.story_status.toLowerCase() == "closed" || status.story_status.toLowerCase() == "закрыто"){
                        if(status.story_resolution.toLowerCase() == "done" || status.story_resolution.toLowerCase() == "готово" || status.story_resolution.toLowerCase() == "выполнено")
                                camundaStatus = "Closed"
                        if(status.story_resolution.toLowerCase() == "rejected" || status.story_resolution.toLowerCase() == "отклонено")
                                camundaStatus = "Canceled"
                    }
            }
            processVariables.setAll({
                status: camundaStatus
            });
            await taskService.complete(task, processVariables)
        }
        catch(e){console.sys(e);}
    }
}

module.exports = Jira