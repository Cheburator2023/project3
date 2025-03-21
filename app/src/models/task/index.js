const sql = require("./sql");
const taskArtefact = require("./helpers/artefact");
const camundaVar = require("./helpers/camundaVar");
const taskOperationsLogs = require("./helpers/taskOperationsLogs");
const getUserName = require("../../route/graphql/resolver/mutation/card/helpers");
const { DEPARTMENT_TO_STREAM_MAPPING } = require("../../common/mapping");

class Task {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  allTask = (idxbpmn) =>
    this.db
      .execute({
        sql: sql.allTask,
        args: { idxbpmn },
      })
      .then((data) => data.rows);

  getBpmnKeyByTaskId = (taskId) =>
    this.db
      .execute({
        sql: sql.bpmnKeyByTaskId,
        args: { taskId },
      })
      .then((data) => data.rows[0]);

  tasksByIds = (tasksIds) =>
    this.db
      .execute({
        sql: sql.tasksByIds,
        args: {
          tasksIds,
        },
      })
      .then((data) => data.rows);

  getGroupsAfterMapping(userGroups) {
    return userGroups.flatMap(
      (group) => DEPARTMENT_TO_STREAM_MAPPING[group] || group
    );
  }

  // Задачи для пользователя
  all = async (user, all = false) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);
    const tasks = await this.bpmn.tasks(user.groups);

    const { bpmnIds, tasksIds } = tasks.reduce(
      ({ bpmnIds, tasksIds }, { taskDefinitionKey, processInstanceId }) => ({
        bpmnIds: [...bpmnIds, processInstanceId],
        tasksIds: [...tasksIds, taskDefinitionKey],
      }),
      {
        bpmnIds: [],
        tasksIds: [],
      }
    );

    const instances = await this.db
      .execute({
        sql: sql.all,
        args: {
          bpmnIds,
          tasksIds,
          groups: user.groups.includes("ds") ? groupsAfterMapping : user.groups,
          is_ds_flg: user.groups.includes("ds") ? "1" : "0",
        },
      })
      .then((data) => data.rows);

    return tasks
      .filter((t) => all || !t.assignee || t.assignee === user.name)
      .map((t) => {
        t.MODEL = instances.find(
          (m) => m.BPMN_INSTANCE_ID === t.processInstanceId
        );
        if (t.MODEL) return { ...t, ...t.MODEL };

        return t;
      })
      .filter((t) => t.MODEL)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  };

  tasksList = async (user) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);
    // user tasks from camunda
    const tasks = await this.bpmn.tasks(user.groups);

    // camunda instances
    const instances = await this.db
      .execute({
        sql: sql.tasksList,
        args: {
          idxbpmn: tasks.map(({ processInstanceId }) => processInstanceId),
          groups: user.groups.includes("ds") ? groupsAfterMapping : user.groups,
          is_ds_flg: user.groups.includes("ds") ? "1" : "0",
        },
      })
      .then((data) => data.rows);

    return tasks
      .filter((t) => !t.assignee || t.assignee === user.name)
      .map((t) => {
        // find model in founded instances
        const model = instances.find(
          (m) => m.BPMN_INSTANCE_ID === t.processInstanceId
        );

        return model ? { ...t, MODEL: model } : t;
      })
      .filter((t) => t.MODEL)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
  };

  // Get all tasks operations by modelId
  tasksOperations = async ({ modelId }) => {
    const taskIdsSet = await this.db
      .execute({
        sql: sql.tasksOperations,
        args: {
          modelId,
        },
      })
      .then(({ rows }) => new Set(rows.map((row) => row.TASK_ID)));

    const tasksOperationsLogs = await Promise.all(
      Array.from(taskIdsSet).map(
        async (taskId) => await this.taskOperationsLogs(taskId, modelId)
      )
    );

    if (!tasksOperationsLogs.length) {
      return null;
    }

    return tasksOperationsLogs.reduce(
      (prevValue, operationLog) => ({
        complete: [...prevValue.complete, ...operationLog.complete],
        rollback: [...prevValue.rollback, ...operationLog.rollback],
      }),
      {
        complete: [],
        rollback: [],
      }
    );
  };

  // Get one task operations
  taskOperationsLogs = async (taskId, modelId) => {
    const { groupResponse } = taskOperationsLogs;

    return await this.db
      .execute({
        sql: sql.taskOperationsLogs,
        args: {
          taskId,
          modelId,
        },
      })
      .then(({ rows }) => groupResponse(rows));
  };

  one = async ({ id, modelId }, user) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);
    // Return task info
    const camundaTask = await this.bpmn.task(id);
    const { processInstanceId, taskDefinitionKey, executionId, endTime } =
      camundaTask;

    const taskOperationsLogs = await this.taskOperationsLogs(
      taskDefinitionKey,
      modelId
    );

    // Check Task
    const check = endTime
      ? true
      : (await this.bpmn.check(executionId, user.groups)).length;
    if (!check) return null;

    const dbInfo = await this.db
      .execute({
        sql: sql.one,
        args: {
          TASK_ID: taskDefinitionKey,
          INSTANCE_ID: processInstanceId,
          groups: user.groups.includes("ds") ? groupsAfterMapping : user.groups,
          is_ds_flg: user.groups.includes("ds") ? "1" : "0",
        },
      })
      .then((d) => (d.rows.length > 0 ? d.rows[0] : {}))
      .then((d) => ({
        MODEL: { ...d },
        operations: taskOperationsLogs,
        ...d,
      }));

    return { ...camundaTask, ...dbInfo };
  };

  model = async ({ MODEL_ID }, user) => {
    const groupsAfterMapping = this.getGroupsAfterMapping(user.groups);
    const tasks = await this.bpmn.tasks(user.groups);

    const instances = await this.db
      .execute({
        sql: sql.model,
        args: {
          MODEL_ID,
          idxbpmn: tasks.map(({ processInstanceId }) => processInstanceId),
          tasks: tasks.map(({ taskDefinitionKey }) => taskDefinitionKey),
          groups: user.groups.includes("ds") ? groupsAfterMapping : user.groups,
          is_ds_flg: user.groups.includes("ds") ? "1" : "0",
        },
      })
      .then((data) => data.rows);

    return instances.map((inst) => {
      const taskBpmn = tasks.find(
        (task) =>
          inst.BPMN_INSTANCE_ID === task.processInstanceId &&
          inst.TASK_ID === task.taskDefinitionKey
      );

      if (taskBpmn) {
        return {
          ...taskBpmn,
          ...inst,
        };
      }
      return inst;
    });
  };

  // Артефакты для задачи
  artefact = ({ taskDefinitionKey, MODEL }) =>
    this.db
      .execute({
        sql: sql.artefact,
        args: {
          id: taskDefinitionKey,
          MODEL_ID: MODEL.MODEL_ID,
          DEPLOYMENT_ID: MODEL.DEPLOYMENT_ID,
        },
      })
      .then((data) => data.rows)
      .then((data) =>
        data.reduce(taskArtefact.reduce, []).map(taskArtefact.map)
      );

  // Add task operation into tasks table logs
  addOperationLog = async ({
    MODEL_ID,
    TASK_ID,
    OPERATION,
    USER_NAME,
    TASK_ID_ROLLED_BACK_FROM: ROLLED_BACK_FROM = null,
  }) =>
    await this.db.execute({
      sql: sql.addOperationLog,
      args: {
        MODEL_ID,
        TASK_ID,
        OPERATION,
        USER_NAME,
        ROLLED_BACK_FROM,
      },
    });

  // Complete
  complete = async ({ id, ARTEFACTS, MODEL_ID, TASK_ID }, user) => {
    const camundaCompleteTask = await this.bpmn.complete(
      id,
      JSON.stringify(camundaVar(ARTEFACTS))
    );

    await this.addOperationLog({
      MODEL_ID,
      TASK_ID,
      OPERATION: "complete",
      USER_NAME: getUserName(user),
    });

    return camundaCompleteTask;
  };
}

module.exports = Task;
