const connector = require('./connector')

class Teamcity {

    start = (body) => connector({
        path: `teamcity/model/build/start`,
        body: JSON.stringify(
            body)
    })

    publish = (body) => connector({
        path: `teamcity/model/publish/start`,
        body: JSON.stringify(
            body
        )
    })
    
    validation = (body) => connector({
        path: `teamcity/validation/start`,
        body: JSON.stringify(body)
    })
}

module.exports = Teamcity