const getModelArtefactsLink = ({ ROOT_MODEL_ID, MODEL_VERSION }) => {
  const interface_url = process.env.INTERFACE_URL || "";

  return `${ interface_url }model/${ ROOT_MODEL_ID }/${ MODEL_VERSION }/artefact`;
};

const getLastImplementationStatus = (activeStatuses) => {
  const activeStatusesList = activeStatuses?.split(";");

  if (activeStatusesList?.includes("Вывод модели из эксплуатации")) {
    return "Вывод модели из эксплуатации";
  };

  if (activeStatusesList?.includes("Разработана, не внедрена")) {
    return "Разработана, не внедрена";
  }

  return activeStatusesList?.[0];
};

const getModelStatus = (modelStatus, modelStatusImplementation) => {
  const lastImplementationStatus = getLastImplementationStatus(
    modelStatusImplementation
  );

  switch (lastImplementationStatus) {
    case "Разработана, не внедрена":
      return "developed_not_implemented";
    case "Вывод модели из эксплуатации":
      return "removal";
    default:
      return modelStatus;
  }
};

const formatModelsResult = ({ rows }) =>
  rows.map((row) => ({
    ...row,
    ROOT_MODEL_ID: +row.ROOT_MODEL_ID,
    MODEL_VERSION: +row.MODEL_VERSION,
    MODEL_STATUS_IMPLEMENTATION: getLastImplementationStatus(
      row.MODEL_STATUS_IMPLEMENTATION
    ),
    MODEL_STATUS: getModelStatus(
      row.MODEL_STATUS,
      row.MODEL_STATUS_IMPLEMENTATION
    ),
    MODEL_ARTEFACTS_LINK: getModelArtefactsLink(row),
  }));

const formatModelsDepartmentsResult = ({ rows }) => {
  return rows.map(
    ({
       DEPARTMENT_NAME,
       INITIALIZATION,
       DATA,
       DATA_SEARCH,
       DATA_PILOT,
       DATA_BUILD,
       MODEL,
       MODEL_VALIDATION,
       INTEGRATION,
       INTEGRATION_DATAMART,
       INTEGRATION_ENV_CONF,
       INTEGRATION_TEST,
       INTEGRATION_USER,
       INTEGRATION_PROD,
       MONITORING,
       MONITORING_AUTO_CORRECT,
       VALIDATION,
       REMOVAL,
     }) => {
      const DATA_SUM = DATA + DATA_SEARCH + DATA_PILOT + DATA_BUILD;
      const DEVELOPMENT_SUM = MODEL + MODEL_VALIDATION;
      const EXPLUATATION_SUM =
        MONITORING + MONITORING_AUTO_CORRECT + VALIDATION;
      const INTEGRATION_SUM =
        INTEGRATION +
        INTEGRATION_DATAMART +
        INTEGRATION_ENV_CONF +
        INTEGRATION_TEST +
        INTEGRATION_USER +
        INTEGRATION_PROD;

      return {
        NAME: DEPARTMENT_NAME,
        MODELS_COUNT:
          INITIALIZATION +
          DATA_SUM +
          DEVELOPMENT_SUM +
          INTEGRATION_SUM +
          EXPLUATATION_SUM,
        DATA: DATA_SUM,
        DEVELOPMENT: DEVELOPMENT_SUM,
        INTEGRATION: INTEGRATION_SUM,
        EXPLUATATION: EXPLUATATION_SUM,
        INITIALIZATION,
        REMOVAL,
      };
    }
  );
};

// Управление моделирования РБ => Стрим моделирование РБ
// Управление моделирования КИБ и СМБ => Стрим моделирование КИБ и СМБ
// Управление моделирования партнерств и ИТ-процессов => Стрим модели партнерств и платформы больших данных
// Управление процессных и финансовых моделей => Стрим моделирование RnD
// Управление перспективных алгоритмов машинного обучения => Стрим моделирование RnD

const getUnionDepartmentsStageValues = (
  firstDepartment = {},
  secondDepartment = {}
) =>
  Object.entries(firstDepartment).reduce(
    (prevValue, [stageName, stageValue]) => {
      return {
        ...prevValue,
        [stageName]: stageValue + secondDepartment[stageName],
      };
    },
    {}
  );

const mappingDevDepartmentsToStreams = (modelDepartments) => {
  const formattedModelDepartments = modelDepartments.reduce(
    (prevValue, { NAME, ...modelDepartmentStages }) => {
      return {
        ...prevValue,
        [NAME]: modelDepartmentStages,
      };
    },
    {}
  );

  return [
    {
      NAME: "Стрим Моделирование РБ",
      ...formattedModelDepartments?.["Управление моделирования РБ"],
    },
    {
      NAME: "Стрим Моделирование КИБ и СМБ",
      ...formattedModelDepartments?.["Управление моделирования КИБ и СМБ"],
    },
    {
      NAME: "Стрим Модели партнерств и платформы больших данных",
      ...formattedModelDepartments?.[
        "Управление моделирования партнерств и ИТ-процессов"
        ],
    },
    {
      NAME: "Стрим Моделирование RnD",
      ...getUnionDepartmentsStageValues(
        formattedModelDepartments?.[
          "Управление процессных и финансовых моделей"
          ],
        formattedModelDepartments?.[
          "Управление перспективных алгоритмов машинного обучения"
          ]
      ),
    },
  ];
};

module.exports = {
  mappingDevDepartmentsToStreams,
  formatModelsDepartmentsResult,
  formatModelsResult,
};
