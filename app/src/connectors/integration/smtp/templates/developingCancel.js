const msg_subject = (model_alias) => 
`[СУМ] Отмена разработки модели ${model_alias}`

const msg_body = ({INTERFACE_URL, model_alias, model_name, cancel_role, model_card_URL, role_name}) => 
`
Разработка модели ${model_alias} ${model_name} отменена. Инициатор заявки ${cancel_role}.
 ${model_card_URL}
Данное уведомление отправлено, так как Вам назначена роль ${role_name}.
Уведомление отправлено автоматически, просьба не отвечать на него.
При возникновении вопросов по работе СУМ обращайтесь в группу технической поддержки: help.sum@vtb.ru.
${INTERFACE_URL}
`
module.exports = {
    msg_subject,
    msg_body
}