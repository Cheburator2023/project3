const moment = require("moment");

class System {
  constructor(db, bpmn) {
    this.bpmn = bpmn;
    this.db = db;
  }

  endEvent = async ({ task, taskService }) => {
    try {
      console.log("Remove parallel call activity");
      const instance = task.variables.get("instance");
      const processInstances = await this.bpmn.processInstances();
      const process = processInstances.find(
        (i) =>
          i.rootProcessInstanceId == instance &&
          (i.processDefinitionKey == "monitoring" ||
            i.processDefinitionKey == "validation")
      );
      console.log(JSON.stringify(process));
      await this.bpmn.deleteProcess(process.id);
    } catch (e) {
      console.log(e);
    }
    await taskService.complete(task);
  };

  suspend = async ({ task, taskService }) => {
    try {
      console.log("Starting suspending model...");

      const { model, key, ...variables } = task.variables.getAll();

      // 1. Validate the consistency of a model's state between the database and Camunda.
      const modelValidationResult =
        await this.db.card.validateModelStateConsistency(model);

      if (modelValidationResult.error) {
        throw new Error(modelValidationResult.errorMessage);
      }

      // 2. Suspend all active process instances
      await this.bpmn.toggleModelSuspension({
        modelId: model,
        suspended: true,
      });

      // 3. Update model data in DB
      // Set model_is_active_flg to 0 in models table
      await this.db.card.cancel({ model });

      // 4. Update cancel process instance in bpmn_instances table (set effective_to to current timestamp)
      await this.db.instance.finish({
        model,
        instance: task.processInstanceId,
        key,
      });

      // 5. Update model_status
      await this.db.card.changeStatus({
        modelId: model,
        modelStatus: variables.model_status ? variables.model_status : null,
      });

      // 6. Finish task and full process in camunda
      await taskService.complete(task);
    } catch (e) {
      console.error(e);
    }
  };

  bpmnStart = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.sys("Инициализация Бизнес процесса");
    try {
      const checlInstance = await this.db.instance.id(task.processInstanceId);

      if (checlInstance) {
        await taskService.complete(task);
        return;
      }

      await this.db.instance.key({
        model: variables.model,
        key: variables.key,
      });
      await this.db.instance.new({
        model: variables.model,
        instance: task.processInstanceId,
        key: variables.key,
      });
      await taskService.complete(task);
      await this.db.card.addStage({
        modelId: variables.model,
        modelStage: variables.model_stage,
      });
      if ("model_status" in variables) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: variables.model_status ? variables.model_status : null,
        });
      }
    } catch (e) {
      console.sys(e);
    }
  };

  bpmnFinish = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.sys("Завершение Бизнес процесса");
    try {
      await this.db.instance.finish({
        model: variables.model,
        instance: task.processInstanceId,
        key: variables.key,
      });
      await taskService.complete(task);
      await this.db.card.removeStage({
        modelId: variables.model,
        modelStage: variables.model_stage,
      });
      if ("model_status" in variables) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: variables.model_status ? variables.model_status : null,
        });
      }
    } catch (e) {
      console.sys(e);
    }
  };

  bpmnStatus = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    console.sys("Смена статуса модели");
    try {
      if ("model_status" in variables) {
        await this.db.card.changeStatus({
          modelId: variables.model,
          modelStatus: variables.model_status ? variables.model_status : null,
        });
      }
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };

  putJobDue = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    try {
      const job = await this.bpmn.getJobByProcessInstanceId(variables.instance);
      if (job.length > 0)
        await this.bpmn.putJobDue(
          job[0].id,
          moment(variables.date_completing_ds_tests).format(
            "YYYY-MM-DDTHH:mm:ss.000+0000"
          )
        );
      await taskService.complete(task);
    } catch (e) {
      console.sys(e);
    }
  };
}

module.exports = System;
