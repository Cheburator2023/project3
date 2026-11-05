const { AuthenticationError } = require('apollo-server-express');
const {
  isBusinessPartner,
} = require('../../../../../utils/permissions/businessPartnerRestrictions');

module.exports = async (root, args, context) => {
    // PRJ-COMMON-26: «Название» и «Описание» недоступны для редактирования
    // Бизнес-партнеру (mipm/mipm_lead)
    if (isBusinessPartner(context.user)) {
        throw new AuthenticationError('Недостаточно прав для редактирования наименования/описания модели');
    }

    if (args.MODEL_NAME) context.db.card.editName(args)
    if (args.MODEL_DESC) context.db.card.editDesc(args)
}
