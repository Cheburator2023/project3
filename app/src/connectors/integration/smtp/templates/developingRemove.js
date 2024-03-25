const msg_subject = (model_alias) =>
  `[СУМ] ${model_alias} выведена из эксплуатации.`;

const msg_body = ({
  INTERFACE_URL,
  model_alias,
  model_name,
  remove_role,
  model_card_URL,
  role_name,
  remove_reason,
}) =>
  `
Пользователь ${remove_role} вывел модель ${model_alias} ${model_name} из эксплуатации с комментарием: ${remove_reason}.

${model_card_URL}
Данное уведомление отправлено, так как Вам назначена роль ${role_name}.
Уведомление отправлено автоматически, просьба не отвечать на него.
При возникновении вопросов по работе СУМ обращайтесь в группу технической поддержки: help.sum@vtb.ru.
${INTERFACE_URL}
`;
module.exports = {
  msg_subject,
  msg_body,
};
