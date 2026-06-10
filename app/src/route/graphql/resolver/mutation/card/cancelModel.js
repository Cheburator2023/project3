const availableGroups = ["ds", "ds_lead", "mipm"];
const cancelInstanceKey = "model_state_transition";
const auditClient = require('../../../../../utils/audit/auditClient');

module.exports = async (root, args, context) => {
    // Формирование информации об инициаторе для аудита
    const initiatorInfo = {
        sub: context.user?.preferred_username || context.user?.username || 'system',
        realm: context.user?.realm || 'staff',
        channel: 'graphql',
        url: '/graphql/mutation/cancelModel',
        method: 'cancelModel',
        sourceIp: context.req?.ip || '127.0.0.1'
    };
    let correlationId;

    try {
        const model = args.MODEL_ID;

        /* Check role model. Only ds, ds_lead, mipm */
        const { groups } = context.user;
        const checkRoleModel =
            availableGroups.filter((g) => groups.includes(g)).length > 0;
        if (!checkRoleModel) return null;

        /* Check if already exist */
        const checkCancelInstance = await context.db.instance.check({
            model,
            key: cancelInstanceKey,
        });

        if (checkCancelInstance.length > 0) {
            // Экземпляр уже запущен – возвращаем его без повторной отправки аудита
            return checkCancelInstance[0].BPMN_INSTANCE_ID;
        }

        // Старт аудита – начало операции отмены разработки модели
        correlationId = await auditClient.start(
            'SUMD_CANCELMODEL',
            initiatorInfo,
            { modelId: model }
        );

        /* Start cancel BPMN-instance on newest deployed schema */
        const instance = await context.bpmn
            .start(
                cancelInstanceKey,
                JSON.stringify({
                    variables: {
                        model: { value: model },
                        transition_reason: { value: "mistake" }, // archive
                    },
                })
            )
            .then((d) => d.id);

        // Успешное завершение – отправка аудита SUCCESS
        await auditClient.success(
            'SUMD_CANCELMODEL',
            correlationId,
            initiatorInfo,
            { modelId: model, bpmnInstanceId: instance }
        );

        return instance;
    } catch (error) {
        // Ошибка – отправка аудита FAILURE
        await auditClient.failure(
            'SUMD_CANCELMODEL',
            correlationId,
            error,
            initiatorInfo,
            { modelId: args.MODEL_ID, errorMessage: error.message }
        );
        console.error(error);
        throw new Error(
            "An error occurred while processing the cancel instance. Please try again."
        );
    }
};