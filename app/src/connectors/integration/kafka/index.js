const connector = require('./connector')

class Kafka {

    message = (body) => connector({
        path: `kafka/send-message`,
        body: JSON.stringify(
            body)
    })

}

module.exports = Kafka