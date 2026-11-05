/**
 * PRJ-COMMON-26, задача №3: сокращение полномочий Бизнес-партнера (mipm, mipm_lead)
 * в карточке модели СУМ.
 *
 * Список artefact_tech_label (словарь sumd.artefacts), недоступных для
 * редактирования ролям mipm/mipm_lead:
 *   - вкладка «Основная информация»;
 *   - вкладка «Артефакты».
 */
const RESTRICTED_MIPM_ARTEFACT_LABELS = [
  'model_desc', // Описание модели
  'model_algorithm', // Тип алгоритма
  'product_name', // Продукт и область применения модели
  'developing_model_reason', // Основание для разработки модели
  'model_type', // Тип/классификация Модели
  'model_type_lev1', // Тип / классификация Модели (ТК4, ARTEFACT_ID 173)
  'model_is_used', // Действующая модель/модуль
  'implementation_decision', // Реквизиты решения о внедрении
  'model_epic_12', // Этап 12
  'model_epic_12_date', // Дата решения для эпика 12
  'rfd', // RFD
  'model_id', // Идентификатор модели в JIRA
  'implementation_segment', // Сегмент применения Модели/РС/Алгоритма
  'significance_validity', // Уровень значимости Модели/РС
  'group_company', // Компания группы
  'responsible_for_significance_validity', // Кем определен уровень значимости Модели/РС
  'dev_model_status_flg', // Модель давно разработана / работает в промышленном контуре
  'assignment_contractor', // Исполнитель
  'dev_team', // Название команды
  'psi_protocol', // Протокол ПСИ
  'project_ref', // Ссылка на репозиторий разработки модели (sumd-контур)
  'code_repository_uri', // Ссылка на репозиторий разработки модели (альтернативный tech_label в СУМ)
  'plan_validation_type', // Тип валидации
  'developing_report', // Отчет по разработке модели / Аналитическая записка
  'model_image_nexus_link', // Адрес образа модели в Nexus
  'container_cfg_file', // Адрес конфигурационного файла контейнера
  'source_code_link', // Ссылка на исходный код проекта
  'build_link', // Ссылка на сборку
  'docker_artifact_link', // Ссылка на артефакт сборки docker
  'remove_decision', // Реквизиты решения о выведении из эксплуатации
  'model_service_dev_link', // Ссылка на сервис для прода/КЗ
  'importance_changes', // Существенность внесенных изменений в РС (ARTEFACT_ID 794)
  'validation_tests', // Скрипты тестов/сценарии валидации (ARTEFACT_ID 153)
  'implementation_doc_set_file', // Комплект документов для внедрения и применения модели (829)
  'model_changes_info', // Краткая информация о решениях по изменению Модели (798)
  'data_lineage_ml_link', // Ссылка на Data Lineage ML (909)
  'devsecops_project_area', // Проектная область в Сфера DevSecOps (910)
  'release_branch', // Релизная ветка (912)
  'deployment_channel', // Канал(ы) внедрения (913)
  'output_table', // Выходная таблица (914)
  'allocation_assessment_class', // Класс оценки аллокаций (915)
  'allocation_assessment_parameters', // Параметры оценки аллокации (916)
  'deploy_team', // Команда, которая внедряла модель (919)
  'runtime_subsystem', // Подсистема реализации модели (920)
  'validation_report_approve_date', // Дата утверждения отчета валидации (792)
  'deploy_system', // Система внедрения (921)
  'order_for_developing_or_buiseness_case', // Заявка на разработку модели или описание гипотезы бизнес-кейса (70)
  'buiseness_process_name', // Бизнес-процесс (59)
  'decision_of_model_completion_doc', // Решение заказчика по модели (700)
  'snapshot_long_datamart', // Snapshot широкой витрины (49)
  'model_integration_dag_link', // Путь к DAG-файлу (prod,test,dev) (856)
  'validation_result_approve_date', // Информация о дате утверждения на УО МР (793)
  'validation_department', // Подразделение, проводившее валидацию (790)
  'full_validation_result_approve_date', // Информация о дате утверждения на УО МР (879)
  'full_validation_department', // Подразделение, проводившее валидацию (874)
  'model_result_purpose_comment', // Комментарий к цели использования результатов модели (66)
];

/**
 * Группы, на которые распространяются ограничения Бизнес-партнера:
 */
const BUSINESS_PARTNER_GROUPS = ['mipm', 'mipm_lead', 'mipm_stream'];

/**
 * Пользователь является Бизнес-партнером (mipm/mipm_lead).
 *
 * @param {Object} user - объект текущего пользователя
 * @returns {boolean}
 */
const isBusinessPartner = (user) =>
  Array.isArray(user && user.groups) &&
  user.groups.some((group) => BUSINESS_PARTNER_GROUPS.includes(group));

/**
 * Запрещён ли артефакт для редактирования пользователю с ролью БП.
 *
 * @param {Object} user - объект текущего пользователя
 * @param {string|undefined} artefactTechLabel - tech_label артефакта
 * @returns {boolean}
 */
const isRestrictedForBusinessPartner = (user, artefactTechLabel) =>
  isBusinessPartner(user) &&
  RESTRICTED_MIPM_ARTEFACT_LABELS.includes(artefactTechLabel);

module.exports = {
  RESTRICTED_MIPM_ARTEFACT_LABELS,
  BUSINESS_PARTNER_GROUPS,
  isBusinessPartner,
  isRestrictedForBusinessPartner,
};