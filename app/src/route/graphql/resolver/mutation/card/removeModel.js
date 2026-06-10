const availableGroups = ["ds", "ds_lead", "mipm"];
const removalInstanceKey = "model_state_transition";
const auditClient = require('../../../../../utils/audit/auditClient');

const checkRoleModel = (userGroups) =>
    availableGroups.some((groupName) => userGroups.includes(groupName));

module.exports = async (root, args, context) => {
    // Формирование информации об инициаторе для аудита
    const initiatorInfo = {
        sub: context.user?.preferred_username || context.user?.username || 'system',
        realm: context.user?.realm || 'staff',
        channel: 'graphql',
        url: '/graphql/mutation/removeModel',
        method: 'removeModel',
        sourceIp: context.req?.ip || '127.0.0.1'
    };
    let correlationId;

    try {
        const modelId = args.MODEL_ID;

        /* Check role model. Only ds_lead, mipm */
        const { groups } = context.user;
        const userHasAccess = checkRoleModel(groups);

        if (!userHasAccess) {
            return null;
        }

        /* Check if already exist */
        const checkRemovalInstance = await context.db.instance.check({
            model: modelId,
            key: removalInstanceKey,
        });

        if (checkRemovalInstance.length > 0) {
            // Экземпляр уже запущен – возвращаем его без повторной отправки аудита
            return checkRemovalInstance[0].BPMN_INSTANCE_ID;
        }

        // Старт аудита – начало операции вывода модели из эксплуатации
        correlationId = await auditClient.start(
            'SUMD_REMOVEMODEL',
            initiatorInfo,
            { modelId: modelId }
        );

        const instance = await context.bpmn
            .start(
                removalInstanceKey,
                JSON.stringify({
                    variables: {
                        model: { value: modelId },
                        transition_reason: { value: "archive" },
                    },
                })
            )
            .then((d) => d.id);

        // Успешное завершение – отправка аудита SUCCESS
        await auditClient.success(
            'SUMD_REMOVEMODEL',
            correlationId,
            initiatorInfo,
            { modelId: modelId, bpmnInstanceId: instance }
        );

        return instance;
    } catch (error) {
        // Ошибка – отправка аудита FAILURE
        await auditClient.failure(
            'SUMD_REMOVEMODEL',
            correlationId,
            error,
            initiatorInfo,
            { modelId: args.MODEL_ID, errorMessage: error.message }
        );
        console.error(error);
        throw new Error(
            "An error occurred while processing the removal instance. Please try again."
        );
    }
};