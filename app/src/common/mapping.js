const DEPARTMENTS = {
  KIB_SMB: "Управление моделирования КИБ и СМБ",
  PARTNERSHIPS_IT: "Управление моделирования партнерств и ИТ-процессов",
  RB: "Управление моделирования РБ",
  ML_ALGORITHMS: "Управление перспективных алгоритмов машинного обучения",
  PROCESS_FINANCIAL: "Управление процессных и финансовых моделей",
};

const STREAMS = {
  KIB_SMB: "Разработка моделей для КМБ и КСБ",
  PARTNERSHIPS_IT_IT: "Модели партнерств и платформы больших данных",
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

/*
 * PRJ-COMMON-26, 45.3: роль «Бизнес-партнер стрима» (mipm_stream).
 * Стрим определяется по СУФФИКСУ AD-группы (префикс стенда dev/test/prod
 * не учитывается) — механизм, единообразный со Смарт-Анкетой
 * (V2_STREAM_SUFFIX_RE) и СУРМ (filterModelsByMipmStream).
 * PRJ-COMMON-26: суффикс AD-группы -> СПИСОК допустимых меток «Стрим-исполнитель».
 * Один стрим в разных контурах/БД (sumd artefact 7, mrms artefact 2074) может быть
 * записан по-разному («Моделирование КИБ и СМБ» / «Разработка моделей для КМБ и КСБ» /
 * «Разработка моделей КМБ/КСБ», «Модели партнерств и платформы больших данных» /
 * «AI-модели партнерств»), поэтому фильтрация должна допускать все варианты.
 */

const MIPM_STREAM_SUFFIX_TO_STREAMS = {
  kmbkcb: [
    "Моделирование КИБ и СМБ",
    "Разработка моделей для КМБ и КСБ",
    "Разработка моделей КМБ/КСБ",
  ],
  rb: [STREAMS.RB],
  rnd: [STREAMS.PARTNERSHIPS_IT_RND],
  finmdl: [STREAMS.PROCESS_FINANCIAL],
  ai: ["Модели партнерств и платформы больших данных", "AI-модели партнерств"],
  ptitpc: ["Модели партнерств и платформы больших данных", "AI-модели партнерств"],
};

const MIPM_STREAM_SUFFIX_RE =
  /(?:^|_)(kmbkcb|rb|rnd|finmdl|ai|ptitpc)$/i;

// Возвращает список меток стримов, доступных пользователю mipm_stream
// (значения артефакта 7 «Стрим-исполнитель»)
function mapMipmStreamGroups(userGroups) {
  const allowedStreams = new Set();

  for (const group of userGroups) {
    if (!group || typeof group !== "string") continue;

    // 1) Суффикс AD-группы (префикс стенда не учитывается)
    const suffixMatch = group.match(MIPM_STREAM_SUFFIX_RE);
    if (suffixMatch) {
      const streams =
        MIPM_STREAM_SUFFIX_TO_STREAMS[suffixMatch[1].toLowerCase()] || [];
      streams.forEach((stream) => allowedStreams.add(stream));
    }

    // 2) Департаментные группы → DEPARTMENT_TO_STREAM_MAPPING
    const mapped = DEPARTMENT_TO_STREAM_MAPPING[group] || [];
    mapped.forEach((stream) => allowedStreams.add(stream));
  }

  return Array.from(allowedStreams);
}

module.exports = {
  DEPARTMENT_TO_STREAM_MAPPING,
  mapMipmStreamGroups,
};
