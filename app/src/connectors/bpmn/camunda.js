const connector = require("./connector");
const querystring = require("querystring");

class Bpmn {
    constructor(db, context) {
        this.connector = (params) => connector(params, context);
        this.context = context;
    }
  // Initialization main
    start = (key = "main", body) =>
        this.connector({
            method: "POST",
            path: `/process-definition/key/${key}/start`,
            body,
        }).catch(error => {
            this.context.log?.({
                msg: `Failed to start process: ${error.message}`,
                event: 'Ошибка',
                level: 'error',
                risCode: '500',
                error: error
            });
            throw error;
        });

  // Start process by Definition Version.
  startByVersion = (key, versionTag, body) =>
    this.connector({
      path: `/process-definition/?key=${key}&versionTag=${versionTag}`,
    })
      .then((d) => {
        if (d.length == 0) {
          throw new Error(
            `Process definition is not found with key ${key} and version tag ${versionTag}`
          );
        }
        return d[0].id;
      }) // Example ID: initialization:2:7b9e3fab-4b50-11ef-a145-b6cb02d3563b (key:version:deploymentId)
      .then((id) => {
        return this.connector({
          method: "POST",
          path: `/process-definition/${id}/start`,
          body,
        });
      });

  message = (body) =>
    this.connector({
      method: "POST",
      path: "/message",
      body,
    });

  msg = (model, messageName = "Message_340hg50", owner = "admin") =>
    this.connector({
      method: "POST",
      path: "/message",
      body: JSON.stringify({
        messageName,
        processInstanceId: model,
        processVariables: {
          model: { value: model },
          owner: { value: owner },
        },
      }),
    });

  // Get Instance by id
  instance = (id) =>
    this.connector({
      path: `/process-instance/${id}/activity-instances`,
    }).catch(() =>
      this.connector({
        path: `/history/process-instance/${id}`,
      })
    );

  // Get Definition by id
  definition = (id) =>
    this.connector({
      path: `/process-definition/${id}/`,
    });

  // Get Process Definition Diagram
  diagram = (id) =>
    this.connector({ path: `/process-definition/${id}/xml` }).then(
      (data) => data.bpmn20Xml
    );

  /**
   * Fetches the activity instance history for a given process instance ID.
   *
   * @param {string} id - The ID of the process instance.
   * @param {boolean} [finished] - Optional parameter to filter activities by their finished status.
   * @returns {Promise} - A promise that resolves with the activity instance history.
   */
  activity = (id, finished) => {
    const queryParams = new URLSearchParams({ processInstanceId: id });

    if (finished !== undefined) {
      queryParams.append(finished ? "finished" : "unfinished", "true");
    }

    return this.connector({
      path: `/history/activity-instance?${queryParams.toString()}`,
    });
  };

  // Job
  getJobByProcessInstanceId = async (id) =>
    this.connector({
      path: `/job?processInstanceId=${id}`,
    });

  putJobDue = async (id, due) =>
    this.connector({
      path: `/job/${id}/duedate`,
      method: "PUT",
      body: JSON.stringify({
        duedate: due,
        cascade: false,
      }),
    });

  // Task
  update = (id, lead) =>
    this.connector({
      path: `task/${id}/`,
      method: "PUT",
      body: JSON.stringify({
        priority: lead ? 0 : 1000,
      }),
    });

  check = (id, groups) =>
    this.connector({
      path: `/task?${querystring.stringify({
        candidateGroups: groups.join(","),
      })}&executionId=${id}&includeAssignedTasks=true`,
    });

  allTask = () =>
    this.connector({
      path: `/task?includeAssignedTasks=false`,
    });

  allNotAssignedTasks = () =>
    this.connector({
      path: `/task?unassigned=true`,
    });

  tasks = (groups = ["mipm"]) =>
    this.connector({
      path: `/task?${querystring.stringify({
        candidateGroups: groups.join(","),
      })}&includeAssignedTasks=true&active=true`,
    });

  tasksByModel = (modelId) =>
    this.connector({
      path: `/task?${querystring.stringify({
        processVariables: "model_eq_" + modelId,
      })}`,
    });

  task = (id) =>
    this.connector({ path: `/task/${id}` })
      .catch(() => this.connector({ path: `/history/task?taskId=${id}` }))
      .then((data) => (Array.isArray(data) ? data[0] : data));

  assignee = (id, username) =>
    this.connector({
      path: `/task/${id}/assignee`,
      method: "POST",
      body: JSON.stringify({ userId: username }),
    });
  // .then(this.update(id, true))

  // TaskComplete
  complete = (id, body) =>
    this.connector({
      path: `/task/${id}/complete`,
      body,
      method: "POST",
    });

  // Tree modification
  modify = async (data, index = 0) => {
    // tree deep
    if (index > data.length - 1) return true;

    const treeEl = data[index];
    const { processInstanceId, activityId, endTime } = treeEl;

    if (!endTime) return this.modify(data, index + 1);
    // First modification
    if (index === 0) {
      const activityData = await this.activity(processInstanceId);
      const chouseActivity = activityData.filter(
        (d) => d.activityId === activityId
      )[0];
      const b = new Date(chouseActivity.endTime).getTime();
      const cancelActivity = activityData.filter((d) => {
        const a = new Date(d.startTime).getTime();
        return a >= b || d.activityId === activityId;
      });

      await this.modification(processInstanceId, cancelActivity, activityId);
      return this.modify(data, index + 1);
    }

    // Get new Instance
    const prevTreeEl = data[index - 1];
    const newPrevActivity = await this.activity(prevTreeEl.processInstanceId);
    const newInstance = newPrevActivity.filter(
      (a) => a.activityId === prevTreeEl.activityId && !a.endTime
    )[0];
    const oldVars = await this.getVars(prevTreeEl.calledProcessInstanceId);

    (data[index].processInstanceId = newInstance.calledProcessInstanceId),
      await this.setVars(data[index].processInstanceId, oldVars);

    // Modification
    const activityData = await this.activity(data[index].processInstanceId);
    await this.modification(
      data[index].processInstanceId,
      activityData.filter(
        (item) =>
          ![
            "Инициализация бизнес-процесса",
            "Инициализация бизнес процесса",
          ].includes(item.activityName)
      ),
      activityId
    );

    return this.modify(data, index + 1);
  };

  getVars = (id) =>
    this.connector({
      path: `/history/variable-instance?processInstanceId=${id}`,
      method: "GET",
    }).then((data) =>
      data.reduce(
        (p, c) => ({
          ...p,
          [c.name]: { value: c.value },
        }),
        {}
      )
    );

  setVars = (id, vars) =>
    this.connector({
      path: `/process-instance/${id}/variables`,
      method: "POST",
      body: JSON.stringify({
        modifications: vars,
      }),
    });

  modification = (id, cancelActivity, activityId) =>
    this.connector({
      path: `/process-instance/${id}/modification`,
      method: "POST",
      body: JSON.stringify({
        skipIoMappings: true,
        skipCustomListeners: true,
        instructions: cancelActivity
          .map((item) => ({
            type: "cancel",
            activityId: item.activityId,
          }))
          .concat([
            {
              type: "startBeforeActivity",
              activityId,
            },
          ]),
      }),
    });

  processInstances = () =>
    this.connector({
      path: `/history/process-instance?active=true`,
    });

  deleteProcess = (id) =>
    this.connector({
      path: `/process-instance/${id}?skipIoMappings=true`,
      method: "DELETE",
    }).catch((e) => null);

  forwardMVP = async (model, vars) => {
    /* SET ADDITIONAL VARIABLES */
    await this.setVars(
      model,
      Object.keys(vars).reduce(
        (prev, key) => ({
          ...prev,
          [key.split("::").length > 1 ? key.split("::")[1] : key]: {
            value: vars[key],
          },
        }),
        {}
      )
    );

    /* CONTINUE MAIN PROCESS */
    await this.msg(model);
  };

  getTaskVar = (taskId, varName) =>
    this.connector({
      path: `/task/${taskId}/variables/${varName}`,
      method: "GET",
    })
      .then((data) => data.value)
      .catch((e) => console.log(e));

  /* ***** SUSPEND MODEL FEATURE ***** */

  /**
   * Retrieves the subprocess instances of the given process instance.
   *
   * @param {{superProcessInstanceId: string, active?: boolean}} params - The parameters for retrieving subprocess instances.
   * @param {string} params.superProcessInstanceId - The ID of the super process instance.
   * @param {boolean} [params.active] - The active state filter for subprocess instances.
   * @returns {Promise<Array<any>>} - A promise that resolves with an array of the subprocess instances.
   */
  getSubProcessInstances = ({ superProcessInstanceId, active }) =>
    this.connector({
      path: `/process-instance?superProcessInstance=${superProcessInstanceId}${
        active ? `&active=${active}` : ""
      }`,
      method: "GET",
    }).then((data) => data || []);

  /**
   * Retrieves all subprocess instances of the given process instance,
   * including its subprocesses, sub-subprocesses, etc.
   *
   * @param {Object} params - The parameters for retrieving subprocess instances.
   * @param {string} params.superProcessInstanceId - The ID of the super process instance.
   * @param {boolean} [params.active] - The active state filter for subprocess instances.
   * @returns {Promise<Array<any>>} - A promise that resolves with an array of the subprocess instances.
   */
  getAllSubProcessInstances = async ({ superProcessInstanceId, active }) => {
    const immediateSubprocesses = await this.getSubProcessInstances({
      superProcessInstanceId,
      active,
    });
    const subProcessPromises = immediateSubprocesses.map((sub) =>
      this.getAllSubProcessInstances({ superProcessInstanceId: sub.id, active })
    );
    const subProcessResults = await Promise.all(subProcessPromises);

    return [
      ...immediateSubprocesses,
      ...subProcessResults.flatMap((result) => result),
    ];
  };

  /**
   * Retrieves a process instance by its ID.
   *
   * @param {string} id - The id of the process instance.
   * @returns {Promise<any>} - A promise that resolves with the process instance.
   */
  getProcessInstance = (id) =>
    this.connector({
      path: `/process-instance/${id}`,
      method: "GET",
    });

  /**
   * Toggles the suspension state of specified process instances.
   *
   * @param {Array<string>} processInstanceIds - The IDs of the process instances to suspend or activate.
   * @param {boolean} suspended - The desired suspension state; true to suspend, false to activate.
   * @returns {Promise<any>} - A promise that resolves when the operation is complete.
   */
  toggleProcessInstancesSuspension = async (processInstanceIds, suspended) =>
    this.connector({
      path: `/process-instance/suspended`,
      method: "PUT",
      body: JSON.stringify({
        processInstanceIds,
        suspended,
      }),
    });

  /**
   * Toggles the suspension state of a model and all its subprocesses in Camunda.
   *
   * This method:
   * 1. Retrieves all subprocess instance IDs associated with the model.
   * 2. Combines the main process instance ID with the subprocess instance IDs.
   * 3. Updates the suspension state of all instances (main process + subprocesses).
   *
   * @param {string} modelId - The unique identifier of the model (corresponding to the super process instance ID).
   * @param {boolean} suspended - The desired suspension state; `true` to suspend, `false` to activate.
   * @returns {Promise<void>} - A promise that resolves when the suspension state is successfully updated.
   * @throws {Error} - Throws an error if the operation fails, including detailed error messages.
   */
  toggleModelSuspension = async ({ modelId, suspended }) => {
    try {
      // 1. Get all subprocess instance IDs
      const camundaInstanceIds = (
        await this.getAllSubProcessInstances({
          superProcessInstanceId: modelId,
        })
      ).map(({ id }) => id);

      // 2. Combine with the main process instance ID
      const camundaInstanceIdsWithMainProcess = [
        modelId,
        ...camundaInstanceIds,
      ];

      // 3. Toggle the suspension state for all instances
      await this.toggleProcessInstancesSuspension(
        camundaInstanceIdsWithMainProcess,
        suspended
      );
    } catch (error) {
      throw new Error(
        `Failed to toggle suspension for model ${modelId}: ${
          error.response?.data || error.message
        }`
      );
    }
  };

  externalTasksByInstanceId = (instanceId) =>
    this.connector({
      path: `/external-task?processInstanceId=${instanceId}`,
    });

  historyTasksByModel = (modelId) =>
    this.connector({
      path: `/history/task?${querystring.stringify({
        processVariables: "model_eq_" + modelId,
      })}`,
    });
}

module.exports = Bpmn;
