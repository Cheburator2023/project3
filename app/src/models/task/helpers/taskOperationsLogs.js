const groupResponse = (operationLogs) => {
  const data = operationLogs.reduce((
    operations,
    {
      ID,
      MODEL_ID,
      OPERATION,
      CREATE_DATE,
      TASK_ID,
      TASK_NAME,
      TASK_ID_ROLLED_BACK_FROM,
      TASK_NAME_ROLLED_BACK_FROM,
      USER_NAME
    }
  ) => {
    if (!OPERATION) {
      return operations;
    }

    let operationLog = {
      id: ID,
      modelId: MODEL_ID,
      createDate: CREATE_DATE,
      operationType: OPERATION,
      userName: USER_NAME
    };

    if (OPERATION === 'complete') {
      operationLog = {
        ...operationLog,
        task: {
          id: TASK_ID,
          name: TASK_NAME,
        },
      };
    }

    if (OPERATION === 'rollback') {
      operationLog = {
        ...operationLog,
        taskFrom: {
          id: TASK_ID_ROLLED_BACK_FROM,
          name: TASK_NAME_ROLLED_BACK_FROM,
        },
        taskTo: {
          id: TASK_ID,
          name: TASK_NAME,
        }
      };
    }

    operations[OPERATION].push(operationLog);

    return operations;

  }, {
    complete: [],
    rollback: [],
  });

  return data;
}

module.exports = {
  groupResponse,
};
