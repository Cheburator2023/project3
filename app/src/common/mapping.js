const DEPARTMENTS = {
  KIB_SMB: "Управление моделирования КИБ и СМБ",
  PARTNERSHIPS_IT: "Управление моделирования партнерств и ИТ-процессов",
  RB: "Управление моделирования РБ",
  ML_ALGORITHMS: "Управление перспективных алгоритмов машинного обучения",
  PROCESS_FINANCIAL: "Управление процессных и финансовых моделей",
};

const STREAMS = {
  KIB_SMB: "Разработка моделей для КМБ и КСБ сегмента",
  PARTNERSHIPS_IT_IT: "Моделирование партнерств и ИТ-процессов",
  PARTNERSHIPS_IT_RND: "Моделирование RnD",
  RB: "Моделирование РБ",
  ML_ALGORITHMS: "Моделирование RnD",
  PROCESS_FINANCIAL: "Финансовое моделирование",
};

const DEPARTMENT_TO_STREAM_MAPPING = {
  [DEPARTMENTS.KIB_SMB]: [STREAMS.KIB_SMB],
  [DEPARTMENTS.PARTNERSHIPS_IT]: [
    STREAMS.PARTNERSHIPS_IT_IT,
    STREAMS.PARTNERSHIPS_IT_RND,
  ],
  [DEPARTMENTS.RB]: [STREAMS.RB],
  [DEPARTMENTS.ML_ALGORITHMS]: [STREAMS.ML_ALGORITHMS],
  [DEPARTMENTS.PROCESS_FINANCIAL]: [STREAMS.PROCESS_FINANCIAL],
};

module.exports = {
  DEPARTMENT_TO_STREAM_MAPPING,
};
