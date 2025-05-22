const moment = require('moment');

const sql = require("../sql");
const { user_roles } = require('../constants');
const { usersActiveTasks } = require("../headers");
const { formatUserTasks } = require('../helpers/formatCamundaUserTasks')

/**
 * ActiveTasksService
 * 
 * Класс для получения активных задач пользователей с различной фильтрацией,
 * обогащением и агрегацией информации о задачах, моделях и стримах.
 */
class ActiveTasksService {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  /**
   * Получает активные задачи пользователей и обогащает их информацией о модели, стримах и ролях.
   * 
   * @param {number} days_of_delay - Количество дней задержки для фильтрации по дате.
   * @returns {Object} Структура с заголовками и массивом задач.
   */
  async getUsersActiveTasks(days_of_delay) {
    const userTasksRaw = await this.getUserTasks();
    const userTasks = this.filterPreferLeadTasks(userTasksRaw);

    const instanceMap = await this.getBpmnInstancesMap(userTasks);

    const modelIds = Array.from(
      new Set(Array.from(instanceMap.values()).map(i => i.MODEL_ID))
    );

    const assigneeHist = await this.getAssigneeHistory(instanceMap, days_of_delay);

    const modelStreamsMap = await this.getModelStreamsFromArtefacts(modelIds);
    const modelMetadataMap = await this.getModelMetadataMap(modelIds, days_of_delay > 0
      ? moment().subtract(days_of_delay, 'days').format('YYYY-MM-DD HH:mm:ss')
      : null);


    const filteredUserTasks = userTasks.filter(task => {
      const instance = instanceMap.get(task.processInstanceId);
      return instance && modelMetadataMap.has(instance.MODEL_ID);
    });

    const result = this.enrichTasks(filteredUserTasks, instanceMap, assigneeHist, modelStreamsMap, modelMetadataMap);

    
    return {
      pagesHeaders: usersActiveTasks,
      pagesData: [result]
    }
  }

  /**
   * Получает задачи всех пользователей на основе ролей.
   * @returns {Array} Сформатированный массив задач пользователей.
   */
  async getUserTasks() {
    const userTasksPromises = user_roles.map((role) => this.bpmn.tasks([role]));
    const userTasksResults = await Promise.all(userTasksPromises);

    const formattedTasks = formatUserTasks(userTasksResults);

    return formattedTasks;
  }

  /**
   * Получает карты BPMN-инстансов на основе задач пользователей.
   * @param {Array} userTasks - Список задач пользователей.
   * @returns {Map} Карта инстансов с ключом MODEL_ID.
   */
  async getBpmnInstancesMap(userTasks) {
    const processInstanceIds = userTasks.map(task => task.processInstanceId);
    const bpmnInstances = await this.db.execute({
      sql: sql.instancesByIds,
      args: { bpmnIds: processInstanceIds },
    });
    return new Map(bpmnInstances?.rows.map(instance => [instance.BPMN_INSTANCE_ID, instance]));
  }

  /**
   * Получает историю назначений на основе карты инстансов.
   * @param {Map} instanceMap - Карта инстансов.
   * @param {number} days_of_delay - Количество дней задержки.
   * @returns {Array} Массив истории назначений.
   */
  async getAssigneeHistory(instanceMap, days_of_delay) {
    // Получаем уникальные MODEL_ID из instanceMap
    const modelIds = Array.from(
      new Set(Array.from(instanceMap.values()).map(i => i.MODEL_ID))
    );

    const assigneeHist = await this.db.execute({
      sql: sql.assigneeHistByModelIds,
      args: {
        modelIds,
        dateOfDelay: days_of_delay > 0 
          ? moment().subtract(days_of_delay, 'days').format('YYYY-MM-DD HH:mm:ss') 
          : null,
      },
    });

    return assigneeHist?.rows;
  }

  /**
   * Получает карту model_id → stream_name на основе значений артефакта (artefact_id = 7).
   * 
   * @param {string[]} modelIds - Список model_id.
   * @returns {Map<string, string>} Карта соответствий model_id → stream.
   */
  async getModelStreamsFromArtefacts(modelIds) {
    const result = await this.db.execute({
      sql: sql.modelStreams,
      args: { modelIds },
    });

    return new Map(
      result.rows.map(({ MODEL_ID, ARTEFACT_STRING_VALUE }) => [MODEL_ID, ARTEFACT_STRING_VALUE])
    );
  }

  async getModelMetadataMap(modelIds, dateOfDelay) {
    const result = await this.db.execute({
      sql: sql.modelsMetadataByIds,
      args: { modelIds, dateOfDelay },
    });

    return new Map(result.rows.map(row => [row.MODEL_ID, row]));
  }

  /**
   * Обогащает задачи пользователей информацией о модели, стримах и ролях.
   * 
   * @param {Array} userTasks - Список задач.
   * @param {Map} instanceMap - Карта инстансов.
   * @param {Array} assigneeHist - История назначений.
   * @param {Map} modelStreamsMap - Карта model_id → stream.
   * @param {Map} modelMetadataMap - Карта model_id → метаданные модели.
   * @returns {Array} Обогащённые задачи.
   */
  enrichTasks(userTasks, instanceMap, assigneeHist, modelStreamsMap, modelMetadataMap) {
    return userTasks.map(task => {
      const instance = instanceMap.get(task.processInstanceId);
      if (!instance) return null;

      const modelId = instance.MODEL_ID;
      const modelMeta = modelMetadataMap.get(modelId);
      const streams = modelStreamsMap.get(modelId);

      return {
        MODEL_ID: modelId,
        MODEL_ALIAS: modelMeta ? `model${modelMeta.ROOT_MODEL_ID}-v${modelMeta.MODEL_VERSION}` : '',
        MODEL_NAME: modelMeta?.MODEL_NAME || 'Нет данных',
        UPDATE_DATE: modelMeta?.UPDATE_DATE || 'Нет данных',
        STATUS: modelMeta?.STATUS || 'Нет данных',
        TASK_NAME: task.name,
        ROLE: this.getEffectiveFunctionalRole(task, assigneeHist, instanceMap),
        ASSIGNEE: task.assignee,
        STREAMS: streams ? [streams] : [],
      };
    }).filter(Boolean);
  }

  /**
   * Возвращает функциональную роль на основе совпадения assignee в истории.
   * Если не найдено — возвращает исходную роль из задачи.
   *
   * @param {Object} task - Задача Camunda (с processInstanceId, assignee, role).
   * @param {Array} assigneeHist - Массив строк с MODEL_ID, ASSIGNEE_NAME, FUNCTIONAL_ROLE.
   * @param {Map<string, Object>} instanceMap - Map по processInstanceId → BPMN instance (с MODEL_ID).
   * @returns {string} - Роль задачи
   */
  getEffectiveFunctionalRole(task, assigneeHist, instanceMap) {
    const instance = instanceMap.get(task.processInstanceId);
    if (!instance || !task.assignee) return task.role;

    const modelId = instance.MODEL_ID;

    const match = assigneeHist.find(row =>
      row.MODEL_ID === modelId &&
      row.ASSIGNEE_NAME?.split(', ').includes(task.assignee)
    );

    return match?.FUNCTIONAL_ROLE || task.role;
  }

  /**
   * Фильтрует задачи, оставляя одну на комбинацию processInstanceId + name,
   * с приоритетом роли *_lead.
   * 
   * @param {Array} tasks - Список задач
   * @returns {Array} Отфильтрованный список задач
   */
  filterPreferLeadTasks(tasks) {
    const taskMap = new Map();

    for (const task of tasks) {
      const key = `${task.processInstanceId}::${task.name}`;
      const isLead = task.role.endsWith('_lead');

      if (!taskMap.has(key)) {
        taskMap.set(key, task);
      } else {
        const existing = taskMap.get(key);
        const existingIsLead = existing.role.endsWith('_lead');

        // если текущий — не lead, а новый — lead — заменяем
        if (isLead && !existingIsLead) {
          taskMap.set(key, task);
        }
      }
    }

    return Array.from(taskMap.values());
  }
}

module.exports = ActiveTasksService;