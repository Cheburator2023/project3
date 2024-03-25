const msg_subject = (model_alias) => 
`[СУМ] В СУМ заведена новая модель ${model_alias}`

const msg_body = ({INTERFACE_URL, model_description, model_alias, model_name, classificators, related_models, model_card_URL, role_name}) => 
`
Модель ${model_alias} ${model_name} заведена в СУМ.
Описание модели:
${model_description}.
Список классификаторов модели:
${classificators}.
Связанные модели:
${related_models}.
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