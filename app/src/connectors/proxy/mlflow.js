const proxy = require('express-http-proxy')
const querystring =  require('querystring')

module.exports = proxy(process.env.MLFLOW_URL, {
    filter: async (req, res) => {
        const query = req.query
        const url = req.url
        /* Check model  */
        return true
    }
})
