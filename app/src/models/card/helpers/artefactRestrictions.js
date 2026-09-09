const userCanWrite = require('../../../utils/permissions/userCanWrite');
const {
  isRestrictedForBusinessPartner,
} = require('../../../utils/permissions/businessPartnerRestrictions');

/**
 * Проверяет уровень доступа к редактированию артефакта у текущего пользователя
 * и возвращает артефакты с соответсвующей пометкой.
 *
 * PRJ-COMMON-26: для ролей mipm/mipm_lead точечно скрывает редактирование
 * перечисленных атрибутов карточки модели СУМ.
 *
 * @param {Object[]} data - исходный набор артефактов
 * @param {Object} user - объект текущего пользователя
 * @returns {Object[]} - список измененных артефактов
 */
module.exports = (data, user) =>
  data.map(({ IS_EDIT_FLG, ...rest }) => {
    const isUserPermitted = userCanWrite(user);
    const isEditEnabled = IS_EDIT_FLG === '1';
    const isRestricted = isRestrictedForBusinessPartner(
      user,
      rest.ARTEFACT_TECH_LABEL || rest.artefact_tech_label
    );

    return {
      ...rest,
      IS_EDIT_FLG: Number(
        isEditEnabled && isUserPermitted && !isRestricted
      ).toString(),
    };
  });
