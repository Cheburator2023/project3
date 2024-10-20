module.exports = async (req, res, next) => {
    try {
        const { login, password } = req.body;
        const { integration } = req.context;
        const { keycloak } = integration;

        if (!login || !password) {
            res.status(400).json({
                error: 'Bad request',
                details: 'Check all required fields',
            });
            return;
        }

        keycloak.getTokenByUsername(login, password).then(token => {
            if (token.error) {
                res.status(401).json({
                    error: token.error,
                    details: token.error_description,
                });
                return;
            }

            res.send(
                JSON.stringify({
                    access_token: token,
                    token_type: "bearer",
                })
            );
        });

    } catch (error) {
        console.error('Error getting auth token:', error.message);
        res.status(500).json({
            error: 'An error occurred while getting auth token. Please try again later.',
            details: error.message,
        });
    }
}
