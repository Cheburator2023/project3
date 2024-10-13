const models = [
  {
    name: "Отчёт",
    headers: [
      {
        key: "MODEL_ALIAS",
        title: "Алиас модели",
      },{
        key: "MODEL_VERSION_ID",
        title: "Идентификатор версии модели",
      },{
        key: "ROOT_MODEL_ID",
        title: "Идентификатор модели в системе",
        type: "number",
      },
      { key: "MODEL_VERSION", title: "Версия модели", type: "number" },
      { key: "MODEL_AUTOML_ATTRIBUTE", title: "Признак AutoML" },
      { key: "MODEL_CHAR_ID", title: "ID модели в Jira" },
      { key: "MODEL_CREATE_DATE", title: "Дата создания модели" },
      { key: "MODEL_NAME", title: "Название модели" },
      { key: "MODEL_DESC", title: "Описание модели" },
      {
        key: "MODEL_ARTEFACTS_LINK",
        title: "Ссылка на артефакты модели",
        type: "link",
      },
      { key: "MODEL_STATUS", title: "Этап ЖЦМ" },
      { key: "MODEL_STATUS_IMPLEMENTATION", title: "Статус модели" },
      { key: "MODEL_INT_END_DATE", title: "Дата внедрения модели" },
      { key: "IMPLEMENTATION_DECISION", title: "Реквизиты решения о внедрении" },
      { key: "MODEL_IS_USED", title: "Модель используется" },
      { key: "COMPANY_GROUP", title: "Компания группы" },
      {
        key: "MODEL_CUSTOMER_DEPT_INFO",
        title: "Подразделение бизнес-заказчика / Владельца модели",
      },
      {
        key: "DS_DEPARTMENT",
        title: "Департамент-разработчик модели",
      },
      {
        key: "PRODUCT_AND_SCOPE",
        title: "Продукт и область применения модели",
      },
      {
        key: "MODEL_DEVELOPING_REASONS",
        title: "Основание для разработки",
      },
      { key: "MODEL_IS_ARCHIVE_ATTRIBUTE", title: "Архив" },
      { key: "MODEL_PRIORITY", title: "Уровень значимости модели" },
      { key: "MODEL_TYPE", title: "Тип модели" },
      { key: "MODEL_SEGMENT", title: "Целевой сегмент модели" },
      { key: "TARGET_VARIABLE", title: "Целевая переменная" },
      { key: "BUISENESS_PROCESS_NAME", title: "Бизнес-процесс" },
      { key: "MODEL_ALGORITHM", title: "Тип алгорима" },
      { key: "USING_MODE", title: "Режим применения" },
    ],
  },
  {
    name: "Подразделение бизнес-заказчика / Владельца модели",
    headers: [
      {
        key: "NAME",
        title: "Подразделение бизнес-заказчика / Владельца модели",
      },
      {
        key: "MODELS_COUNT",
        title: "Количество моделей",
        type: "number",
      },
      { key: "INITIALIZATION", title: "Инициализация", type: "number" },
      { key: "DATA", title: "Данные", type: "number" },
      { key: "DEVELOPMENT", title: "Разработка", type: "number" },
      { key: "INTEGRATION", title: "Внедрение", type: "number" },
      { key: "EXPLUATATION", title: "Эксплуатация", type: "number" },
      { key: "REMOVAL", title: "Выведение", type: "number" },
    ],
  },
  {
    name: "Стрим-разработчик модели",
    headers: [
      {
        key: "NAME",
        title: "Стрим-разработчик модели",
      },
      {
        key: "MODELS_COUNT",
        title: "Количество моделей",
        type: "number",
      },
      { key: "INITIALIZATION", title: "Инициализация", type: "number" },
      { key: "DATA", title: "Данные", type: "number" },
      { key: "DEVELOPMENT", title: "Разработка", type: "number" },
      { key: "INTEGRATION", title: "Внедрение", type: "number" },
      { key: "EXPLUATATION", title: "Эксплуатация", type: "number" },
      { key: "REMOVAL", title: "Выведение", type: "number" },
    ],
  },
];

const modelsByMipm = [
  {
    name: "Отчёт",
    headers: [
      { key: "BC_NAME", title: "Бизнес-заказчик" },
      { key: "BC_DEPARTMENT_NAME", title: "Подразделение-заказчик" },
      {
        key: "NUM_OF_MODELS_BY_BC_DEPARTMENT",
        title: "Количество моделей подразделения-заказчика",
      },
      { key: "MODEL_ALIAS", title: "ID карточки" },
      { key: "MODEL_NAME", title: "Наименование модели" },
      { key: "CREATE_DATE", title: "Дата создания карточки" },
      { key: "MODEL_STATUS", title: "Статус модели" },
    ],
  },
];

const model_risk = [
  {
    name: "Отчёт",
    headers: [
      { key: "COMPANY_GROUP", title: "Компания группы" },
      { key: "MODEL_NAME", title: "Название модели" },
      { key: "ROOT_MODEL_ID", title: "Идентификатор модели" },
      { key: "MODEL_VERSION", title: "Версия модели" },
      { key: "MODEL_TYPE_LEV1", title: "Тип модели (1-й уровень)" },
      { key: "MODEL_TYPE_LEV2", title: "Тип модели (2-й уровень)" },
      { key: "MODEL_SEGMENT_VALID", title: "Сегмент модели" },
      { key: "SIGN_ADJACENCY", title: "Признак смежности моделей" },
      { key: "VALIDATION_RESULT", title: "Результат валидации" },
      {
        key: "MR_RATE_SEGMENT",
        title: "Результат по МР для сегмента (учет PD и LGD)",
      },
      {
        key: "MR_SIGN_EXCESSIVE_CONSERVATISM",
        title: "Признак избыточной конервативности, покрывающей 100% риска",
      },
      { key: "DATE_KUORR", title: "Дата валидации/ ре-калибровки" },
      { key: "MR_SIGN_EK", title: "Использование для расчета ЭК" },
      //{key: 'MR_RATE_A_OBSOLESCENCE', title: 'Коэф А. - устаревания'},
      {
        key: "MR_RATE_A_OBSOLESCENCE_CALC",
        title: "Коэф А. - расчетный - устаревания",
      },
      {
        key: "MR_TEST_RESULT_1",
        title: "1.Полнота описания допущений и ограничений_valid ",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_1",
        title: "Комментарий к результату теста 1_valid",
      },
      {
        key: "MR_TEST_RESULT_2",
        title:
          "2.Однозначно ли разработчик определил сегмент разработки и насколько данные, используемые для построения, соответствуют этому сегменту_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_2",
        title: "Комментарий к результату теста 2_valid",
      },
      {
        key: "MR_TEST_RESULT_3",
        title:
          "3.Наличие существенной информации, которая могла бы повлиять на работу модели, но не вошла в разработку_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_3",
        title: "Комментарий к результату теста 3_valid",
      },
      {
        key: "MR_TEST_RESULT_4",
        title:
          "4.Наличие осознания о переобучаемости модели, применение/неприменение консервативных надбавок (иследовался ли разработчиком этот аспект, другие замечания по структуре и дизайну модели_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_4",
        title: "Комментарий к результату теста 4_valid",
      },
      {
        key: "MR_TEST_RESULT_5",
        title:
          "5.Качество ранжирования/результаты прохождения бэк тестирования_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_5",
        title: "Комментарий к результату теста 5_valid",
      },
      {
        key: "MR_TEST_RESULT_6",
        title: "6.Стабильность ранжирования/результатов бэктестирования_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_6",
        title: "Комментарий к результату теста 6_valid",
      },
      {
        key: "MR_TEST_RESULT_7",
        title:
          "7.По сегменту применения: стабильность, репрезентативность, однородность_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_7",
        title: "Комментарий к результату теста 7_valid",
      },
      {
        key: "MR_TEST_RESULT_8",
        title:
          "8.Калибровка, недооценка/переоценка риска и другие существенные замечания, количественного анализа/консервативность модели_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_8",
        title: "Комментарий к результату теста 8_valid",
      },
      {
        key: "MR_TEST_RESULT_9",
        title:
          "9.Соответствие разработки и применения модели в части технической реализации расчета (в том числе приёмо-сдаточные испытания), потоков данных, сегмента применения_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_9",
        title: "Комментарий к результату теста 9_valid",
      },
      {
        key: "MR_TEST_RESULT_10",
        title:
          "10.Контроль качества входных данных, используемых при применении модели в ИТ системе_valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_10",
        title: "Комментарий к результату теста 10_valid",
      },
      {
        key: "MR_TEST_RESULT_11",
        title:
          "11.Недостатки и изменения, выявленные в части процесса применения модели._valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_11",
        title: "Комментарий к результату теста 11_valid",
      },
      {
        key: "MR_TEST_RESULT_12",
        title:
          "12.Недостатки и изменения, выявленные в части процесса применения модели._valid",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_12",
        title: "Комментарий к результату теста 12_valid",
      },
      {
        key: "MR_TEST_RESULT_1_DS",
        title: "1.Полнота описания допущений и ограничений_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_1_DS",
        title: "Комментарий к результату теста 1_ds",
      },
      {
        key: "MR_TEST_RESULT_2_DS",
        title:
          "2.Однозначно ли разработчик определил сегмент разработки и насколько данные, используемые для построения, соответствуют этому сегменту_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_2_DS",
        title: "Комментарий к результату теста 2_ds",
      },
      {
        key: "MR_TEST_RESULT_3_DS",
        title:
          "3.Наличие существенной информации, которая могла бы повлиять на работу модели, но не вошла в разработку_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_3_DS",
        title: "Комментарий к результату теста 3_ds",
      },
      {
        key: "MR_TEST_RESULT_4_DS",
        title:
          "4.Наличие осознания о переобучаемости модели, применение/неприменение консервативных надбавок (иследовался ли разработчиком этот аспект, другие замечания по структуре и дизайну модели_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_4_DS",
        title: "Комментарий к результату теста 4_ds",
      },
      {
        key: "MR_TEST_RESULT_5_DS",
        title:
          "5.Качество ранжирования/результаты прохождения бэк тестирования_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_5_DS",
        title: "Комментарий к результату теста 5_ds",
      },
      {
        key: "MR_TEST_RESULT_6_DS",
        title: "6.Стабильность ранжирования/результатов бэктестирования_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_6_DS",
        title: "Комментарий к результату теста 6_ds",
      },
      {
        key: "MR_TEST_RESULT_7_DS",
        title:
          "7.По сегменту применения: стабильность, репрезентативность, однородность_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_7_DS",
        title: "Комментарий к результату теста 7_ds",
      },
      {
        key: "MR_TEST_RESULT_8_DS",
        title:
          "8.Калибровка, недооценка/переоценка риска и другие существенные замечания, количественного анализа/консервативность модели_ds",
      },
      {
        key: "MR_COMMENT_TEST_RESULT_8_DS",
        title: "Комментарий к результату теста 8_ds",
      },
      { key: "MR_RATIO_K_VALIDATION", title: "Коэф К модели Валидация" },
      { key: "MR_RATIO_K_DEVELOP", title: "Коэф К модели Разработка" },
      { key: "MR_RATIO_K_RESULT", title: "Коэф К модели Итог" },
      { key: "MR_RATIO_K_PROCESS_ANALYSIS", title: "Коэф К анализа процессов" },
      {
        key: "MR_RATE_K",
        title: "К без признака смежности сигнала на уровне сигнала по модели",
      },
      { key: "MR_RATIO_K_PROCES_MODELS", title: "Коэф К модели и процесса" },
      {
        key: "MR_RATE_ADJACENCY",
        title: "Коэф с учетом смежности на желтых на уровне коэффициентов",
      },
      //{key: 'MR_RATIO_K_FINAL_OBSOLESCENCE', title: 'Итоговое значение коэф к модели и процесса (с учетом устаревания)'},
      {
        key: "MR_RATIO_K_FINAL_OBSOLESCENCE_CALC",
        title:
          "Итоговое значение коэф к модели и процесса (с учетом устаревания) расчетное",
      },
    ],
  },
];

const assignment = [
  {
    name: "Отчёт",
    headers: [
      { key: "CREATE_DATE", title: "Дата создания" },
      { key: "ASSIGNMENT_NUMBER", title: "№ п/п" },
      { key: "STATUS", title: "Статус" },
      { key: "ASSIGNMENT_CONTRACTOR", title: "Исполнитель" },
      { key: "ASSIGNMENT_TEXT", title: "Текст поручения" },
      { key: "ASSIGNMENT_PROTOCOL_DETAILS", title: "Реквизиты протокола" },
      { key: "ASSIGNMENT_UO_NAME", title: "Наименование УО" },
      { key: "ASSIGNMENT_UO_QUESTION", title: "Название вопроса на УО" },
      { key: "ASSIGNMENT_DEPARTMENT", title: "Подразделение" },
      { key: "ASSIGNMENT_END_DATE", title: "Срок поручения" },
      { key: "ASSIGNMENT_MODEL", title: "Модели" },
      { key: "ASSIGNMENT_MODEL_RISK", title: "Модельный риск" },
      { key: "ASSIGNMENT_RISK_TYPE", title: "Вид риска" },
    ],
  },
];

const risk_scale = [
  {
    name: "Отчёт",
    headers: [
      { key: "SCALE_CODE", title: "Код шкалы" },
      { key: "RISK_SCALE_NAME", title: "Название шкалы" },
      { key: "SCALE_CATEGORY", title: "Категория шкалы" },
      { key: "SCALE_ID", title: "Идентификатор шкалы" },
      { key: "CORRESP_SCALE", title: "Соответствующая шкала РА" },
      { key: "SCALE_RANK_CAT", title: "Разряд шкалы" },
      { key: "SCALE_TYPE", title: "Тип шкалы" },
      { key: "SCALE_PARAMETER", title: "Параметр" },
      { key: "SCALE_RANK_MIN", title: "Нижняя граница" },
      { key: "SCALE_RANK_MAX", title: "Верхняя граница" },
      { key: "RISK_SCALE_START_DATE", title: "Дата начала действия шкалы" },
      { key: "RISK_SCALE_END_DATE", title: "Дата окончания действия шкалы" },
      { key: "CURRENT_DATE", title: "Дата актуальности отчета" },
      { key: "VERSION", title: "Версия шкалы" },
      {
        key: "PARAMETER_VALUE",
        title: "Значение параметров модели для разряда шкалы",
      },
    ],
  },
];

const validation = [
  {
    name: "Отчёт",
    headers: [
      { key: "ROOT_MODEL_ID", title: "корневой ID модели" },
      { key: "MODEL_ID", title: "ID модели" },
      { key: "MODEL_NAME", title: "имя модели" },
      { key: "MODEL_VERSION", title: "версия модели" },
      { key: "MODEL_DESC", title: "описание модели" },
      { key: "MODEL_TYPE", title: "тип модели" },
      { key: "MODEL_TYPE_LEV1", title: "тип модели (1-ый уровень иерхархии)" },
      { key: "MODEL_TYPE_LEV2", title: "тип модели (2-ой уровень иерхархии)" },
      { key: "MODEL_TYPE_LEV3", title: "тип модели (3-ий уровень иерхархии)" },
      {
        key: "MODEL_TYPE_ID",
        title:
          'id выбранных значений классификатора "тип модели" (техническое поле)',
      },
      {
        key: "PRODUCT_AND_SCOPE",
        title: "продукт и область применения модели",
      },
      {
        key: "PRODUCT_AND_SCOPE_ID",
        title:
          'id выбранных значений классификатора "продукт и область применения" (техническое поле)',
      },
      { key: "MODEL_STATUS", title: "статус модели" },
      { key: "MODEL_DEV_END_DATE", title: "дата окончания разработки модели" },
      { key: "MODEL_INT_END_DATE", title: "дата окончания внедрения модели" },
      { key: "MODEL_VAL_DATE", title: "дата последней валидации" },
      { key: "VAL_TYPE", title: "тип последней валидации" },
      { key: "VAL_RESULTS", title: "результат последней валидации" },
    ],
  },
];

const rate_system = [
  {
    name: "Отчёт",
    headers: [
      {
        key: "MODEL_ALIAS",
        title: "Алиас модели",
      },
      { key: "ROOT_MODEL_ID", title: "Идентификатор модели в системе" },
      { key: "MODEL_VERSION", title: "Версия модели" },
      { key: "MODEL_AUTOML_ATTRIBUTE", title: "Признак AutoML" },
      { key: "MODEL_CHAR_ID", title: "ID модели в Jira" },
      { key: "MODEL_NAME", title: "Название модели" },
      { key: "MODEL_DESC", title: "Описание модели" },
      { key: "COMPANY_GROUP", title: "Компания группы" },
      {
        key: "MODEL_CUSTOMER_DEPT_INFO",
        title: "Подразделение бизнес-заказчика / Владельца модели",
      },
      { key: "MODEL_CUSTOMER_INFO", title: "Имя бизнес-заказчика" },
      {
        key: "DS_DEPARTMENT",
        title: "Департамент-разработчик модели",
      },
      {
        key: "UPDATE_DATE",
        title: "Дата последнего изменения",
      },
      {
        key: "PRODUCT_AND_SCOPE",
        title: "Продукт и область применения модели",
      },
      {
        key: "MODEL_DEVELOPING_REASONS",
        title: "Основание для разработки",
      },
      { key: "MODEL_PRIORITY", title: "Уровень значимости модели" },
      { key: "MODEL_TYPE_LEV1", title: "Тип модели (1-й уровень)" },
      { key: "MODEL_TYPE_LEV2", title: "Тип модели (2-й уровень)" },
      { key: "MODEL_SEGMENT", title: "Целевой сегмент модели" },
      { key: "TARGET_VARIABLE", title: "Целевая переменная" },
      { key: "BUISENESS_PROCESS_NAME", title: "Бизнес-процесс" },
      { key: "MODEL_DEV_END_DATE", title: "Дата завершения разработки Модели" },
      {
        key: "MODEL_INT_END_DATE",
        title: "Дата ввода модели в эксплуатацию",
      },
      {
        key: "MODEL_REMOVAL_END_DATE",
        title: "Дата вывода модели из эксплуатации",
      },
      {
        key: "DEVELOPING_END_DATE",
        title: "Дата окончания разработки",
      },
      {
        key: "MODEL_EPIC_05",
        title: "Епик 05",
      },
    ],
  },
];

const usersActiveTasks = [
  {
    name: "Отчёт",
    headers: [
      { key: "MODEL_ID", title: "ID Модели" },
      { key: "MODEL_ALIAS", title: "Алиас Модели" },
      { key: "MODEL_NAME", title: "Название модели" },
      { key: "STATUS", title: "Статус модели" },
      { key: "UPDATE_DATE", title: "Дата последнего обновления" },
      { key: "TASK_NAME", title: "Название задачи" },
      { key: "ROLE", title: "Роль" },
      { key: "USER_NAME", title: "Исполнитель"},
      { key: "STREAMS", title: "Стрим"}
    ],
  },
];

module.exports = {
  models,
  modelsByMipm,
  model_risk,
  assignment,
  risk_scale,
  validation,
  rate_system,
  usersActiveTasks,
};
