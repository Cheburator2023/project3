const moment = require("moment");
const { Variables } = require("camunda-external-task-client-js");
const { model_status } = require("../../../common/status-map");
const { getLastActiveStatus } = require("../../../common/status-helpers");
const auditClient = require('../../../utils/audit/auditClient');
const tslgLogger = require('../../../utils/logger');

class System {
    constructor(db, bpmn) {
        this.bpmn = bpmn;
        this.db = db;
    }

    endEvent = async ({ task, taskService }) => {
        let correlationId;
        const initiator = { sub: 'system', channel: 'bpmn', method: 'endEvent' };
        try {
            correlationId = await auditClient.start('SUMD_TASKCOMPLETE', initiator, { taskId: task.id });
            try {
                console.log("Remove parallel call activity");
                const instance = task.variables.get("instance");
                const processInstances = await this.bpmn.processInstances();
                const process = processInstances.find(
                    (i) =>
                        i.rootProcessInstanceId == instance &&
                        (i.processDefinitionKey == "monitoring" || i.processDefinitionKey == "validation")
                );
                console.log(JSON.stringify(process));
                await this.bpmn.deleteProcess(process.id);
            } catch (e) { console.log(e); }
            await taskService.complete(task);
            await auditClient.success('SUMD_TASKCOMPLETE', correlationId, initiator, { taskId: task.id });
        } catch (error) {
            await auditClient.failure('SUMD_TASKCOMPLETE', correlationId, error, initiator, { taskId: task.id });
            throw error;
        }
    };

    cancel = async ({ task, taskService }) => {
        let correlationId;
        const initiator = { sub: 'system', channel: 'bpmn', method: 'cancel' };
        try {
            console.info('Отмена разработки модели');
            const model = task.variables.get("model");
            correlationId = await auditClient.start('SUMD_CANCELMODEL', initiator, { modelId: model });
            const instances = await this.db.instance.model({ model });
            console.info('Завершение всех инстансов модели', model);
            await Promise.all(instances.map(inst => this.bpmn.deleteProcess(inst.BPMN_INSTANCE_ID)));
            await this.db.card.cancel({ model });
            await taskService.complete(task);
            await auditClient.success('SUMD_CANCELMODEL', correlationId, initiator, { modelId: model });
        } catch (error) {
            await auditClient.failure('SUMD_CANCELMODEL', correlationId, error, initiator, { modelId: task.variables.get("model") });
            throw error;
        }
    };

    bpmnStart = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys('Инициализация Бизнес процесса');
        try {
            await this.db.instance.new({ model: variables.model, instance: variables.instance, key: variables.key });
            await taskService.complete(task);
        } catch (e) { console.sys(e); }
    };

    bpmnFinish = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys('Завершение Бизнес процесса');
        let correlationId;
        const initiator = { sub: 'system', channel: 'bpmn', method: 'bpmnFinish' };
        try {
            correlationId = await auditClient.start('SUMD_TASKCOMPLETE', initiator, { modelId: variables.model });
            await this.db.instance.finish({ model: variables.model, instance: task.processInstanceId, key: variables.key });
            await taskService.complete(task);
            await this.db.card.removeStage({ modelId: variables.model, modelStage: variables.model_stage });
            if ("model_status" in variables && variables.model_status) {
                await this.db.card.changeStatus({ modelId: variables.model, modelStatus: variables.model_status });
                if (variables.model_status === 'Архив') {
                    await this.db.card.editActiveStatus({ MODEL_ID: variables.model, MODELS_IS_ACTIVE_FLG: 0 });
                }
            } else {
                const model = await this.db.card.getCurrentModelStatus(variables.model);
                if (model.artefacts_model_status && model.artefacts_model_status.split(';').includes('Архив')) {
                    await this.db.card.editActiveStatus({ MODEL_ID: variables.model, MODELS_IS_ACTIVE_FLG: 0 });
                }
            }
            await auditClient.success('SUMD_TASKCOMPLETE', correlationId, initiator, { modelId: variables.model });
        } catch (error) {
            await auditClient.failure('SUMD_TASKCOMPLETE', correlationId, error, initiator, { modelId: variables.model });
            console.sys(error);
        }
    };

    updateModelInfo = async ({ task, taskService }) => {
        let correlationId;
        const initiator = { sub: 'system', channel: 'bpmn', method: 'updateModelInfo' };
        try {
            const { model, model_stage } = task.variables.getAll();
            correlationId = await auditClient.start('SUMD_CANCELMODEL', initiator, { modelId: model });
            await this.db.card.cancel({ model });
            await this.db.card.changeStage({ modelId: model, modelStage: model_stage ? model_stage : null });
            await taskService.complete(task);
            await auditClient.success('SUMD_CANCELMODEL', correlationId, initiator, { modelId: model });
        } catch (e) {
            await auditClient.failure('SUMD_CANCELMODEL', correlationId, e, initiator, { modelId: task.variables.get("model") });
            throw e;
        }
    };

    healthCheck = async ({ task, taskService }) => {
        console.log("Starting health check model...");
        const { model } = task.variables.getAll();
        const modelValidationResult = await this.db.card.validateModelStateConsistency(model);
        const processVariables = new Variables();
        if (modelValidationResult.error) {
            processVariables.setAll({ is_healthy: false, healthy_error: modelValidationResult.errorMessage });
        } else {
            processVariables.setAll({ is_healthy: true, healthy_error: "" });
        }
        await taskService.complete(task, processVariables);
    };

    suspend = async ({ task, taskService }) => {
        try {
            console.log("Starting suspending model...");
            const { model } = task.variables.getAll();
            await this.bpmn.toggleModelSuspension({ modelId: model, suspended: true });
            await taskService.complete(task);
        } catch (e) { console.error(e); }
    };

    bpmnStatus = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        console.sys("Смена статуса модели");
        try {
            if ("model_status" in variables) {
                await this.db.card.changeStatus({ modelId: variables.model, modelStatus: variables.model_status });
            }
            await taskService.complete(task);
        } catch (e) { console.sys(e); }
    };

    putJobDue = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        try {
            const job = await this.bpmn.getJobByProcessInstanceId(variables.instance);
            if (job.length > 0)
                await this.bpmn.putJobDue(
                    job[0].id,
                    moment(variables.date_completing_ds_tests).format("YYYY-MM-DDTHH:mm:ss.000+0000")
                );
            await taskService.complete(task);
        } catch (e) { console.sys(e); }
    };

    needModelOps = async ({ task, taskService }) => {
        const variables = task.variables.getAll();
        try {
            const processVariables = new Variables();
            const { CAMUNDA_MODEL_STATUS, ARTEFACTS_MODEL_STATUS } = await this.db.card.getCurrentModelStatus(variables.model);
            const status = CAMUNDA_MODEL_STATUS || getLastActiveStatus(ARTEFACTS_MODEL_STATUS);
            const filteredValues = [
                model_status.developed_not_implemented,
                model_status.validated_outside_pim,
                model_status.implemented_outside_pim,
                model_status.implementing_outside_pim
            ];
            processVariables.setAll({ need_model_ops: !filteredValues.includes(status) });
            await taskService.complete(task, processVariables);
        } catch (e) { console.sys(e); }
    };
}

module.exports = System;