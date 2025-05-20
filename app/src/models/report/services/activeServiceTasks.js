const moment = require('moment');

const sql = require("../sql");
const { user_roles } = require('../constants');
const { usersActiveTasks } = require("../headers");
const { formatUserTasks } = require('../helpers/formatCamundaUserTasks')
const { DEPARTMENT_TO_STREAM_MAPPING } = require('../../../common/mapping');

/**
 * ActiveTasksService
 * 
 * Класс для получения активных задач пользователей с различной фильтрацией и агрегацией данных.
 * Содержит методы для получения задач, истории назначений и связанных пользователей.
 */
class ActiveTasksService {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  /**
   * Получает активные задачи пользователей.
   * @param {number} days_of_delay - Количество дней для фильтрации просроченных задач.
   * @returns {Object} Объект с заголовками страниц и данными по активным задачам.
   */
  async getUsersActiveTasks(days_of_delay) {
    const userTasks = await this.getUserTasks();
    const taskMap = new Map(userTasks.map(task => [task.processInstanceId + task.role, task]))

    // const users = await this.getUsersInGroups();
    const instanceMap = await this.getBpmnInstancesMap(userTasks);
    const assigneeHist = await this.getAssigneeHistory(instanceMap, days_of_delay);
    const modelStreamsMap = await this.getModelStreamsFromArtefacts();

    const result = this.aggregateTasks(assigneeHist, instanceMap, taskMap, modelStreamsMap);
    
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
   * Получает соответствие моделей и стримов на основе значений артефакта.
   * 
   * Использует таблицу artefact_realizations, где стримы привязаны к model_id
   * через artefact_id = 7
   * Возвращает Map, где ключ — model_id, а значение — название стрима.
   *
   * @returns {Map<string, string>} Карта соответствий model_id → stream_name.
   */
  async getModelStreamsFromArtefacts() {
    const result = await this.db.execute({
      sql: sql.modelStreams,
      args: {},
    });

    return new Map(result.rows.map(({ MODEL_ID, ARTEFACT_STRING_VALUE }) => [MODEL_ID, ARTEFACT_STRING_VALUE]));
  }


  // /**
  //  * Получает пользователей, сгруппированных по отделам.
  //  * @returns {Object} Карта пользователей по отделам.
  //  */
  // async getUsersInGroups() {
  //   const allGroups = await this.integration.keycloak.getSubGroupsByGroupsName([
  //     'departament', 'departament_business_customer'
  //   ]);

  //   const userGroupsMap = {};
  //   await Promise.all(allGroups.map(async (group) => {
  //     const users = await this.integration.keycloak.getUsersInGroup(group.id);
  //     users.forEach(user => {
  //       if (!userGroupsMap[user.username]) {
  //         userGroupsMap[user.username] = [];
  //       }
  //       userGroupsMap[user.username].push(group.name);
  //     });
  //   }));

  //   return userGroupsMap;
  // }

  /**
   * Агрегирует задачи пользователей на основе истории назначений.
   * @param {Array} assigneeHist - История назначений.
   * @param {Map} instanceMap - Карта инстансов.
   * @param {Map} taskMap - Карта задач.
   * @param {Object} users - Карта model_id → stream_name.
   * @returns {Array} Агрегированные задачи.
   */
  aggregateTasks(assigneeHist, instanceMap, taskMap, modelStreamsMap) {
    const ROLE_TO_LEAD_ROLE = this.mapRolesToLeads();

    const aggregated = assigneeHist.reduce((acc, item) => {
      const instance = instanceMap.get(item.BPMN_INSTANCE_ID);
      if (!instance) return acc;

      const taskKey = instance.BPMN_INSTANCE_ID + item.FUNCTIONAL_ROLE;
      const task = taskMap.get(taskKey);
      if (!task) return acc;

      const key = instance.BPMN_INSTANCE_ID;
      if (!acc[key]) {
        acc[key] = this.initializeTaskItem(item);
      }

      acc[key].TASK_NAMES.add(task.name);
      acc[key].USER_NAMES.add(item.ASSIGNEE_NAME);
      acc[key].ASSIGNEES.add(task.assignee || '');

      this.setRole(acc[key], task, item, ROLE_TO_LEAD_ROLE);
      this.addStreamsFromArtefacts(acc[key], item.MODEL_ID, modelStreamsMap);

      return acc;
    }, {});

    return Object.values(aggregated).map(this.formatTaskResult);
  }

  /**
   * Создает карту ролей, сопоставляя каждую роль с её лидирующей версией.
   * 
   * @returns {Object} Карта соответствия ролей и ролей лидера.
   * Формат: { роль: роль_лидера }
   */
  mapRolesToLeads() {
    return user_roles.reduce((map, role) => {
      // Если роль не содержит суффикс '_lead'
      if (!role.includes('_lead')) {
        // Формируем соответствующую лидирующую роль, добавляя '_lead' к текущей роли
        const leadRole = `${role}_lead`;
        // Если такая лидирующая роль существует в списке всех ролей, добавляем её в карту
        if (user_roles.includes(leadRole)) {
          map[role] = leadRole;
        }
      }
      return map;
    }, {});
  }

  /**
   * Инициализирует объект задачи.
   */
  initializeTaskItem(item) {
    return {
      MODEL_ID: item.MODEL_ID,
      MODEL_NAME: item.MODEL_NAME,
      MODEL_ALIAS: `model${item.ROOT_MODEL_ID}-v${item.MODEL_VERSION}`,
      UPDATE_DATE: item.UPDATE_DATE,
      STATUS: item.STATUS,
      TASK_NAMES: new Set(),
      USER_NAMES: new Set(),
      ASSIGNEES: new Set(),
      STREAMS: new Set(),
      ROLES: new Set(),
      ROLE: '',
    };
  }

  /**
   * Назначает роль задачи на основе исполнителя или роли лидера.
   * 
   * @param {Object} taskItem - Объект задачи, содержащий информацию о модели и связанных задачах.
   * @param {Object} task - Задача, содержащая имя и назначенного исполнителя.
   * @param {Object} item - Элемент истории назначения задачи, содержащий функциональную роль.
   * @param {Object} roleToLead - Карта, связывающая обычные роли с ролями лидера.
   */
  setRole(taskItem, task, item, roleToLead) {
    // Проверяем, является ли текущий исполнитель назначенным на задачу
    if (task.assignee && item.ASSIGNEE_NAME.split(', ').includes(task.assignee)) {
      // Если да, назначаем роль задачи на основе функциональной роли из истории назначения
      taskItem.ROLE = item.FUNCTIONAL_ROLE;
    } else {
      // Если исполнитель не совпадает, проверяем, является ли текущая роль ролью лидера
      const role = task.role.includes('_lead') ? task.role : roleToLead[task.role];
      // Если роль найдена (либо прямая, либо через лидера), добавляем её в набор ролей задачи
      if (role) taskItem.ROLES.add(role);
    }
  }

  /**
   * Добавляет стрим модели в задачу на основе заранее полученной карты стримов.
   * 
   * Использует Map, полученный из artefact_realizations, где для каждой модели
   * заранее определён её стрим. Если стрим найден, добавляет его в Set STREAMS.
   *
   * @param {Object} taskItem - Объект агрегированной задачи.
   * @param {string} modelId - Идентификатор модели.
   * @param {Map<string, string>} streamsMap - Карта model_id → stream_name.
   */
  addStreamsFromArtefacts(taskItem, modelId, streamsMap) {
    const stream = streamsMap.get(modelId);
    if (stream) {
      taskItem.STREAMS.add(stream);
    }
  }


  // addStreamsFromUsernames(taskItem, assigneeNames, users) {
  //   assigneeNames.split(', ').forEach(username => {
  //     if (users[username]) {
  //       users[username].forEach(department => {
  //         const streams = DEPARTMENT_TO_STREAM_MAPPING[department];
  //         if (Array.isArray(streams)) {
  //           streams.forEach(s => taskItem.STREAMS.add(s));
  //         } else if (streams) {
  //           taskItem.STREAMS.add(streams);
  //         }
  //       });
  //     }
  //   });
  // }

  formatTaskResult(item) {
    return {
      MODEL_ID: item.MODEL_ID,
      MODEL_NAME: item.MODEL_NAME,
      MODEL_ALIAS: item.MODEL_ALIAS,
      UPDATE_DATE: item.UPDATE_DATE,
      STATUS: item.STATUS,
      TASK_NAME: Array.from(item.TASK_NAMES).join(', '),
      ROLE: item.ROLE || Array.from(item.ROLES).join(', '),
      ASSIGNEE: Array.from(item.ASSIGNEES).join(', '),
      STREAMS: Array.from(item.STREAMS).join(', '),
    };
  }
}

module.exports = ActiveTasksService;