const { AuthenticationError, UserInputError } = require('apollo-server-express');
const userCanWrite = require('../../../../../utils/permissions/userCanWrite');

module.exports = async (root, args, context) => {
  const {
    MODEL_ID,
    ARTEFACT = {},
  } = args;

  const {
    ARTEFACT_ID,
    ARTEFACT_STRING_VALUE,
  } = ARTEFACT;

  // Проверяем уровень доступа текущего пользователя
  if (!userCanWrite(context.user)) {
    throw new AuthenticationError(`Недостаточно прав для редактирования артефакта: "${ARTEFACT_ID}"`);
  }

  // Проверяем, существует ли артефакт с переданным значением
  const artefacts = await context.db
    .artefact
    .specific({
      MODEL_ID,
      ARTEFACT_ID,
      ARTEFACT_STRING_VALUE,
    });

  if (artefacts?.length) {
    throw new UserInputError(`Артефакт со значением: "${ARTEFACT_STRING_VALUE}" уже существует.`);
  }

  // Архивируем существующий артефакт
  await context.db
    .artefact
    .update({
      MODEL_ID,
      ARTEFACT_IDS: [ARTEFACT_ID],
    });

  // Добавляем новый артефакт
  await context.db
    .artefact
    .add({
      MODEL_ID,
      ARTEFACTS: [ARTEFACT]
    });

  // Если артефакт "Значимость", оповестить валидаторов
  if (ARTEFACT_ID === 67) {
    try {
      const template_name = 'artefactHistory';
      const role_name = 'validator';

      // Текущая модель для отображения версии
      const model = await context.db
        .integration
        .modelGet(MODEL_ID)
        .then(d => d.rows[0])

      // Пользователи относящиеся к модели
      const modelUsers = await context.db
        .user
        .card(MODEL_ID)
        .then(data =>
          data
            .filter(d => d.role === role_name || d.role === `${role_name}_lead`)
            .map(d => d.username)
        );
      
      // Все пользователи валидаторы
      const users = await context.integration
        .keycloak
        .getUsersByGroupSystem(role_name);
      
      // Адреса валидаторов
      const users_mail = users
        .filter(item => item.email && modelUsers.includes(item.username))
        .map(item => item.email);
      
      // Параметры шаблона сообщения
      const model_alias = `model${model.ROOT_MODEL_ID}-v${model.MODEL_VERSION}`;
      const interface_url = process.env.INTERFACE_URL || '';

      await context.integration
        .smtp
        .email({
          to: users_mail,
          subject: context.integration.smtp.getMsgSubject(template_name, model_alias),
          text_content: context.integration.smtp.getMsgBody(template_name, {
            model_alias,
            field_name: ARTEFACT_STRING_VALUE,
            model_card_URL: `${interface_url}model/${model.ROOT_MODEL_ID}/${model.MODEL_VERSION}/main`,
            role_name,
            interface_url,
          }),
        });
    } catch (e) {
      console.sys(JSON.stringify(e))
    }
  }

  return true;
}
