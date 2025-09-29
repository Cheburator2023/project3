const fetch = require('isomorphic-fetch')
const tslgLogger = require('../../../utils/logger');

const repoHost = process.env.REPO_API

module.exports = ({
                      path,
                      method,
                      data
                  }) => {
    tslgLogger.log(`Repo request: ${method} ${repoHost}${path}`, 'Запрос', 'info', null, {
        system: 'Repo',
        path,
        method
    });

    let queryString = '';
    const headers = {};
    headers['Content-Type'] = 'application/json';

    const params = new URLSearchParams();
    for (const i in data) {
        params.append(i, data[i]);
    }
    queryString = params.toString();

    const requestOptions = {
        method,
        headers,
    };

    if (['POST', 'PATCH', 'PUT'].includes(method)) {
        requestOptions['body'] = JSON.stringify(data);
    }

    return fetch(`${repoHost}${path}?${queryString}`, requestOptions)
        .then(data => {
            tslgLogger.log(`Repo response: ${data.status}`, 'Ответ', 'info', null, {
                system: 'Repo',
                path,
                method,
                status: data.status
            });

            if (data.status === 200) return data.json();

            const error = new Error(data.statusText);
            error.status = data.status;
            error.system = 'Repo';

            tslgLogger.log(`Repo error: ${data.statusText}`, 'Ошибка', 'error', error, {
                system: 'Repo',
                path,
                method,
                status: data.status
            });

            throw error;
        })
        .catch(error => {
            tslgLogger.log(`Repo unexpected error: ${error.message}`, 'Ошибка', 'error', error, {
                system: 'Repo',
                path,
                method
            });
            throw error;
        });
}