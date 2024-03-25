const msg_subject = (model_alias) => 
`[СУМ] Завершена валидация по модели ${model_alias}`

const msg_body = ({INTERFACE_URL, stage_name, model_alias, model_name, step_name, model_card_URL, role_name, start_validation, end_validation}) => 
`
Модель ${model_alias} ${model_name} завершила шаг ${step_name} подпроцесса ${stage_name}.
Время проведения валидации:
Начало ${start_validation}.
Конец ${end_validation}.
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