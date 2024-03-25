const msg_subject = (model_alias) => 
`[СУМ] Возвращена заявка по ${model_alias}`

const msg_body = ({INTERFACE_URL, stage_name, model_alias, model_name, jira_comment, step_name, model_card_URL, role_name}) => 
`
В подпроцессе ${stage_name} заявка по модели ${model_alias} ${model_name} отменена по причине: ${jira_comment}.
Процесс перешел на шаг ${step_name}.
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