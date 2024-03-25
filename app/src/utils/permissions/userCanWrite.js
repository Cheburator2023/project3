const allowedGroups = ['ds_lead', 'mipm', 'ds'];

/**
 * Проверяет уровень доступа к изменению данных у текущего пользователя.
 * 
 * @param {Object} user - объект текущего пользователя 
 * @returns {boolean}
 */
module.exports = ({ groups } = {}) => {
  return Array.isArray(groups) 
    ? groups.some(item => allowedGroups.includes(item))
    : false;
};