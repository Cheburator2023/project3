const msg_subject = (model_alias) => `[СУМ] У модели ${model_alias} изменилось поле "Значимость"`;

const msg_body = ({
  model_alias,
  field_name,
  model_card_URL,
  role_name,
  interface_url,
}) => `
Модели ${model_alias} присвоено значение ${field_name} для поля "Значимость".

${model_card_URL}
Данное уведомление отправлено, так как Вам назначена роль ${role_name}.
Уведомление отправлено автоматически, просьба не отвечать на него.
При возникновении вопросов по работе СУМ обращайтесь в группу технической поддержки: help.sum@vtb.ru.
${interface_url}
`;

module.exports = {
  msg_subject,
  msg_body,
};