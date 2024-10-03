const connector = require('./connector');
const querystring = require('querystring');

class Bpmn {
  constructor(db) {
    this.connector = connector;
  }

  // Initialization main
  start = (key = 'main', body) =>
    this.connector({
      method: 'POST',
      path: `/process-definition/key/${key}/start`,
      body,
    });

  // Start process by Definition Version.
  startByVersion = (key, version, body) =>
    this.connector({
      path: `/process-definition/?key=${key}&version=${version}`
    })
      .then(d => d[0].id) // Example ID: initialization:2:7b9e3fab-4b50-11ef-a145-b6cb02d3563b (key:version:deploymentId)
      .then(id => {
        return this.connector({
          method: 'POST',
          path: `/process-definition/${id}/start`,
          body
        })
      })

  message = (body) =>
    this.connector({
      method: 'POST',
      path: '/message',
      body,
    });

  msg = (model, messageName = 'Message_340hg50', owner = 'admin') =>
    this.connector({
      method: 'POST',
      path: '/message',
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
  diagram = (id) => this.connector({ path: `/process-definition/${id}/xml` }).then((data) => data.bpmn20Xml);

  // Get Instance Activity
  fullActivity = (id) => this.connector({ path: `/history/activity-instance?processInstanceId=${id}` });

  activity = (id) => this.connector({ path: `/history/activity-instance?processInstanceId=${id}` });

  // Job
  getJobByProcessInstanceId = async (id) =>
    this.connector({
      path: `/job?processInstanceId=${id}`,
    });

  putJobDue = async (id, due) =>
    this.connector({
      path: `/job/${id}/duedate`,
      method: 'PUT',
      body: JSON.stringify({
        duedate: due,
        cascade: false,
      }),
    });

  // Task
  update = (id, lead) =>
    this.connector({
      path: `task/${id}/`,
      method: 'PUT',
      body: JSON.stringify({
        priority: lead ? 0 : 1000,
      }),
    });

  check = (id, groups) =>
    this.connector({
      path: `/task?${querystring.stringify({
        candidateGroups: groups.join(','),
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

  tasks = (groups = ['mipm']) =>
    this.connector({
      path: `/task?${querystring.stringify({ candidateGroups: groups.join(',') })}&includeAssignedTasks=true`,
    });

  task = (id) =>
    this.connector({ path: `/task/${id}` })
      .catch(() => this.connector({ path: `/history/task?taskId=${id}` }))
      .then((data) => (Array.isArray(data) ? data[0] : data));

  assignee = (id, username) =>
    this.connector({
      path: `/task/${id}/assignee`,
      method: 'POST',
      body: JSON.stringify({ userId: username }),
    });
  // .then(this.update(id, true))

  // TaskComplete
  complete = (id, body) =>
    this.connector({
      path: `/task/${id}/complete`,
      body,
      method: 'POST',
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
      const activityData = await this.fullActivity(processInstanceId);
      const chouseActivity = activityData.filter((d) => d.activityId === activityId)[0];
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
    const newInstance = newPrevActivity.filter((a) => a.activityId === prevTreeEl.activityId && !a.endTime)[0];
    const oldVars = await this.getVars(prevTreeEl.calledProcessInstanceId);

    (data[index].processInstanceId = newInstance.calledProcessInstanceId),
      await this.setVars(data[index].processInstanceId, oldVars);

    // Modification
    const activityData = await this.activity(data[index].processInstanceId);
    await this.modification(
      data[index].processInstanceId,
      activityData.filter(
        (item) => !['Инициализация бизнес-процесса', 'Инициализация бизнес процесса'].includes(item.activityName)
      ),
      activityId
    );

    return this.modify(data, index + 1);
  };

  getVars = (id) =>
    this.connector({
      path: `/history/variable-instance?processInstanceId=${id}`,
      method: 'GET',
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
      method: 'POST',
      body: JSON.stringify({
        modifications: vars,
      }),
    });

  modification = (id, cancelActivity, activityId) =>
    this.connector({
      path: `/process-instance/${id}/modification`,
      method: 'POST',
      body: JSON.stringify({
        skipIoMappings: true,
        skipCustomListeners: true,
        instructions: cancelActivity
          .map((item) => ({
            type: 'cancel',
            activityId: item.activityId,
          }))
          .concat([
            {
              type: 'startBeforeActivity',
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
      method: 'DELETE',
    }).catch((e) => null);

  forwardMVP = async (model, vars) => {
    /* SET ADDITIONAL VARIABLES */
    await this.setVars(model, Object.keys(vars).reduce(
      (prev, key) => ({
        ...prev,
        [key.split('::').length > 1 ? key.split('::')[1] : key]: { value: vars[key] },
      }),
      {}
    ));

    /* CONTINUE MAIN PROCESS */
    await this.msg(model);
  };
}

module.exports = Bpmn;
