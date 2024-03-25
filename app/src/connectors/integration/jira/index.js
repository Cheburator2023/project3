const connector = require('./connector')

class Jira {

    issue = (key, alias, body) => connector({
        path: `jira/${key}/${alias}/story/create`,
        body: JSON.stringify(body)
    })

    status = key => connector({
        path: `jira/${key}/status`
    })
    
}

module.exports = Jira