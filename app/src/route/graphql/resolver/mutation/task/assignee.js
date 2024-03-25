module.exports = async (root, args, context) => {
    const { TASK_ID, newAssignee }= args

    /* Check task */
    const task = await context.db
        .task
        .one({ id: TASK_ID }, context.user)

    /* Пользователь не может рабоать с задачей */
    if (!task) return null

    /* Получаем участников модели */
    const users = await context.db
        .user
        .card(task.MODEL.MODEL_ID)

    /* Проверяем что текущий пользователь имеет право работать с моделью */
    if (!users.filter(u => u.username === context.user.username).length) 
        return null
    
    /* Проверяем что назначаемый пользователь имеет право работать с моделью */
    if (newAssignee && !users.filter(u => u.username === newAssignee.username).length)
        return null

    /* is_lead = check user is Lead */
    const is_lead = context.user
        .groups
        .map(context.integration.keycloak.isLead)
        .filter(g => g)
        .length > 0

    console.log(is_lead)

    /* Отказ от задачи */
    if (!is_lead && !newAssignee) {
        /* Get user lead */
        const userLead = await context.integration
            .keycloak
            .userLead(context.user)
        /* Send email to lead */
        return context.integration
            .smtp
            .email({
                to: userLead.filter(d => d.email).map(d => d.email),
                subject: 'Отмена задачи',
                text_content: `Запрос на отмену задачи ${task.name} для модели model${task.MODEL.ROOT_MODEL_ID}-v${task.MODEL.MODEL_VERSION}.`
            })
            .then(d => d.status === 'ok')
    }
    
    /* Не лид назначает на другого */
    if (!is_lead && newAssignee && newAssignee.username !== context.user.username)
        return null

    /* Если человек берет в работу */
    if (newAssignee && newAssignee.username === context.user.username) {
        try {
            /* Get user lead */
            const userLead1 = await context.integration
                .keycloak
                .userLead(context.user)
            /* Send email to lead */
            await context.integration
                .smtp
                .email({
                    to: userLead1.filter(d => d.email).map(d => d.email),
                    subject: 'Задача взята в работу',
                    text_content: `Уведомление о том, что задача ${task.name} для модели model${task.MODEL.ROOT_MODEL_ID}-v${task.MODEL.MODEL_VERSION} взята в работу.`
                })
                .then(d => d.status === 'ok')
        } catch (err) {
            console.error(err)
        }

        return context.bpmn.assignee(
            TASK_ID, 
            newAssignee.username
        )
    }

    /* Лид назачаеи задачу */
    if (is_lead)
        return context.bpmn.assignee(
            TASK_ID, 
            newAssignee ? newAssignee.username : null
        )

    return null
}
