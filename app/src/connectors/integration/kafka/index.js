const connector = require('./connector')

class Kafka {

    message = (body) => connector({
        path: `kafka/send-message`,
        body: JSON.stringify(
            body)
    })

    issue = (key, alias, body, context = {}) => connector({
        path: `jira/${key}/${alias}/story/create`,
        body: JSON.stringify(body)
    }, context)

}

module.exports = Kafka