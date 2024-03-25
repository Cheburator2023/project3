const msg_subject = (model_alias) => 
`[СУМ] У модели ${model_alias} изменился статус`

const msg_body = ({INTERFACE_URL, stage_name, model_alias, model_name, step_name, model_card_URL, role_name, status_name}) => 
`
Модель ${model_alias} ${model_name} завершила шаг ${step_name} подпроцесса ${stage_name}. Модели присвоен статус ${status_name}.
${model_card_URL}
Данное уведомление отправлено, так как Вам назначена роль ${role_name}.
Уведомление отправлено автоматически, просьба не отвечать на него.
При возникновении вопросов по работе СУМ обращайтесь в группу технической поддержки: help.sum@vtb.ru.
Логотип_СУМ
${INTERFACE_URL}
`

module.exports = {
    msg_subject,
    msg_body
}