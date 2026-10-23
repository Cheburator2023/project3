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
  AI_PARTNERSHIPS: "AI-модели партнерств",
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
  [STREAMS.AI_PARTNERSHIPS]: [STREAMS.AI_PARTNERSHIPS],
  [DEPARTMENTS.RB]: [STREAMS.RB],
  [DEPARTMENTS.ML_ALGORITHMS]: [STREAMS.ML_ALGORITHMS],
  [DEPARTMENTS.PROCESS_FINANCIAL]: [STREAMS.PROCESS_FINANCIAL],
};

/*
 * PRJ-COMMON-26, 45.3: роль «Бизнес-партнер стрима» (mipm_stream).
 * Стрим определяется по СУФФИКСУ AD-группы (префикс стенда dev/test/prod
 * не учитывается) — механизм, единообразный со Смарт-Анкетой
 * (V2_STREAM_SUFFIX_RE) и СУРМ (filterModelsByMipmStream).
 *
 * В БД (sumd.artefact_values, artefact_id = 7 «Стрим-исполнитель») встречаются
 * КАК метки стримов, ТАК И названия департаментов (Keycloak-маппер добавляет
 * в groups и название департамента, и /departament/<название>), поэтому
 * фильтрация должна допускать оба варианта.
 */
const MIPM_STREAM_SUFFIX_MAP = {
  kmbkcb: {
    streams: [STREAMS.KIB_SMB],
    department: DEPARTMENTS.KIB_SMB,
  },
  rb: {
    streams: [STREAMS.RB],
    department: DEPARTMENTS.RB,
  },
  rnd: {
    streams: [STREAMS.PARTNERSHIPS_IT_RND],
    department: DEPARTMENTS.ML_ALGORITHMS,
  },
  finmdl: {
    streams: [STREAMS.PROCESS_FINANCIAL],
    department: DEPARTMENTS.PROCESS_FINANCIAL,
  },
  ai: {
    streams: ["AI-модели партнерств"],
    department: "AI-модели партнерств",
  },
  ptitpc: {
    streams: [STREAMS.PARTNERSHIPS_IT_IT],
    department: DEPARTMENTS.PARTNERSHIPS_IT,
  },
};

const MIPM_STREAM_SUFFIX_RE =
  /(?:^|_)(kmbkcb|rb|rnd|finmdl|ai|ptitpc)$/i;

// Возвращает список значений «Стрим-исполнитель» (артефакт 7), доступных
// пользователю mipm_stream: метки стримов и названия департаментов.
function mapMipmStreamGroups(userGroups) {
  const allowedStreams = new Set();

  for (const group of userGroups) {
    if (!group || typeof group !== "string") continue;

    // 1) Суффикс AD-группы (префикс стенда не учитывается)
    const suffixMatch = group.match(MIPM_STREAM_SUFFIX_RE);
    if (suffixMatch) {
      const entry = MIPM_STREAM_SUFFIX_MAP[suffixMatch[1].toLowerCase()];
      if (entry) {
        entry.streams.forEach((stream) => allowedStreams.add(stream));
        if (entry.department) allowedStreams.add(entry.department);
      }
    }

    // 2) Департаментные группы → DEPARTMENT_TO_STREAM_MAPPING
    //    (Keycloak-маппер добавляет название департамента и /departament/<...>)
    const mapped = DEPARTMENT_TO_STREAM_MAPPING[group] || [];
    if (mapped.length) {
      allowedStreams.add(group);
      mapped.forEach((stream) => allowedStreams.add(stream));
    }
  }

  return Array.from(allowedStreams);
}

module.exports = {
  DEPARTMENT_TO_STREAM_MAPPING,
  mapMipmStreamGroups,
};
