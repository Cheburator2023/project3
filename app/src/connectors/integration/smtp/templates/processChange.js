const msg_subject = (model_alias) => 
`[СУМ] Модель ${model_alias} перешла на новый шаг подпроцесса`

const msg_body = ({INTERFACE_URL, stage_name, model_alias, model_name, step_name, model_card_URL, role_name, next_step_name, next_stage_name}) => 
`
Модель ${model_alias} ${model_name} завершила шаг ${step_name} подпроцесса ${stage_name}, процесс перешел на шаг ${next_step_name } подпроцесса ${next_stage_name }.
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