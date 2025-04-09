module.exports = async (req, res, next) => {
    const nlpApiTuz = process.env.NLP_API_TUZ;
    const regv4 = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    try {
        const { model_name, model_id, version_id, ds_department } = req.body;
        const { db, user } = req.context;

        if (!user) {
            res.status(401).json({
                error: 'Authentication is required',
            });
            return;
        }

        if (user.username !== nlpApiTuz) {
            res.status(403).json({
                error: 'Forbidden.',
            });
            return;
        }

        if (!model_name || !model_id || !version_id || !ds_department) {
            res.status(400).json({
                error: 'Bad request',
                details: 'Check all required fields',
            });
            return;
        }

        if (!regv4.test(model_id)) {
            res.status(400).json({
                error: 'Bad request',
                details: 'model_id UUID is incorrect',
            });
            return;
        }

        if (!regv4.test(version_id)) {
            res.status(400).json({
                error: 'Bad request',
                details: 'version_id UUID is incorrect',
            });
            return;
        }

        // Сопоставляем ds_department со справочником значений, записываем artefact_value_id
        const dsDepartmentPossibleValues = await db.artefact.possibleValues({ ARTEFACT_ID: 6 });
        const dsDepartmentPattern = ds_department.replaceAll(/["'«»]/g, '.');
        const dsDepartmentArtefactValue = dsDepartmentPossibleValues.find((item) => {
            return item.ARTEFACT_VALUE.match(RegExp(`^${dsDepartmentPattern}$`, 'i')) !== null;
        });

        if (!dsDepartmentArtefactValue) {
            res.status(400).json({
                error: 'Bad request',
                details: 'given ds_department does not exist',
            });
            return;
        }
    
        // Создаём карточку модели
        await db.card.createNewByGeneralModelId({
            MODEL_ID: version_id,
            MODEL_NAME: model_name,
            MODEL_DESC: 'Модель NLP',
            generalModelId: model_id,
        });
    
        // Получаем созданную карточку модели
        const model = await db.card.info({
            MODEL_ID: version_id,
        });

        // Добавить артефакты
        await db.artefact.add({
            MODEL_ID: version_id, 
            ARTEFACTS: [{
                MODEL_ID: version_id,
                ARTEFACT_ID: 6, // business_customer_departament
                ARTEFACT_VALUE_ID: dsDepartmentArtefactValue.ARTEFACT_VALUE_ID,
                ARTEFACT_STRING_VALUE: null,
            }, {
                MODEL_ID: version_id,
                ARTEFACT_ID: 67, // significance_validity
                ARTEFACT_VALUE_ID: 568, // Низкая
                ARTEFACT_STRING_VALUE: null,
            }],
        });

        const alias = `model${model.ROOT_MODEL_ID}-v${model.MODEL_VERSION}`;

        res.status(201).json({
            model_alias: alias,
            success: true,
        });
        
    } catch (error) {
        console.error('Error creating model:', error.message);
        res.status(500).json({
            error: 'An error occurred while creating the NLP model. Please try again later.',
            details: error.message,
        });
    }
}
