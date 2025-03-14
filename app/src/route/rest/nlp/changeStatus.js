module.exports = async (req, res, next) => {
    const nlpApiTuz = process.env.NLP_API_TUZ;
    const nlpModelStatusMap = {
        '1': 'Разработана, не внедрена',
        '2': 'Внедрена в ПИМ',
        '3': 'Архив',
    };

    try {
        const { model_status_code: modelStatusCode } = req.body;
        const { db, user } = req.context;
        const { versionId } = req.params;

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
        
        if (!nlpModelStatusMap.hasOwnProperty(String(modelStatusCode))) {
            res.status(400).json({
                error: `Model status code ${String(modelStatusCode)} doesn't exist`,
            });
            return;
        }

        /* GET MODEL FROM DB */
        const model = await db.card.info({
            MODEL_ID: versionId, 
        });

        if (!model) {
            res.status(404).json({
                error: 'Not found',
            });
            return;
        }

        await db.card.changeStatus({
            modelId: versionId,
            modelStatus: nlpModelStatusMap[String(modelStatusCode)],
        });

        res.status(200).json({
            success: true,
        });
        
    } catch (error) {
        console.error('Error changing status: ', error.message);
        res.status(500).json({
            error: 'An error occurred while changing status. Please try again later.',
            details: error.message,
        });
    }
}
