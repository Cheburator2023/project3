const userCanWrite = require('../../../utils/permissions/userCanWrite');

/**
 * Проверяет уровень доступа к редактированию артефакта у текущего пользователя
 * и возвращает артефакты с соответсвующей пометкой.
 *
 * @param {Object[]} data - исходный набор артефактов
 * @param {Object} user - объект текущего пользователя
 * @returns {Object[]} - список измененных артефактов
 */
module.exports = (data, user) => data.map(({ IS_EDIT_FLG, ...rest }) => {
  const isUserPermitted = userCanWrite(user);
  const isEditEnabled = IS_EDIT_FLG === '1';

  return {
    ...rest,
    IS_EDIT_FLG: Number(isEditEnabled && isUserPermitted).toString(),
  };
});
