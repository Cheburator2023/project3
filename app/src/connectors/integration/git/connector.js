const fetch = require('isomorphic-fetch')

const gitHost = process.env.GIT_API

module.exports = ({
                      path,
                      method = 'GET',
                      body,
                      file
                  }, context = {}) => {

    if (context?.log) {
        context.log({
            msg: `GIT request: ${method} ${gitHost}${path}`,
            event: 'Запрос',
            level: 'info',
            risCode: '0000'
        });
    }

    const headers = {}
    if (!file)
        headers['Content-Type'] = 'application/json'
    return fetch
    (
        `${gitHost}${path}`,
        {
            method: body ? 'POST' : method,
            headers,
            body
        }
    )
        .then(data => {
            if (context?.log) {
                context.log({
                    msg: `GIT response: ${data.status} ${data.statusText}`,
                    event: 'Ответ',
                    level: 'info',
                    risCode: data.status.toString()
                });
            }

            if (data.status === 200) return data.json()

            const error = new Error(data.statusText)
            error.status = data.status
            error.system = 'GIT'

            if (context?.log) {
                context.log({
                    msg: `GIT error: ${data.statusText}`,
                    event: 'Ошибка',
                    level: 'error',
                    risCode: data.status.toString(),
                    error: error
                });
            }

            throw error
        })
}