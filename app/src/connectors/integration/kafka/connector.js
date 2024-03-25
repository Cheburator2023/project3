const fetch = require('isomorphic-fetch')

const kafkaHost = process.env.KAFKA_API

module.exports = ({ 
    path, 
    method = 'GET',
    body
}) => {
    console.sys('Kafka POST:', `${kafkaHost}${path}`)
    
    const headers = {}
    headers['Content-Type'] = 'application/json'
    return fetch
    (
        `${kafkaHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
    .then(data => {
        console.sys('Kafka', data.status)

        if (data.status === 200) return data.json()
        error.status = data.status
        error.system = 'Kafka'
        throw error
    })
}