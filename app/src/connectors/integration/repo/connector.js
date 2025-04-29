const fetch = require('isomorphic-fetch')

const repoHost = process.env.REPO_API

module.exports = ({ 
    path, 
    method,
    data
}) => {
    console.sys(`Repo ${method}:`, `${repoHost}${path}`)
    
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
            console.sys('Repo', data.status);

            if (data.status === 200) return data.json();

            const error = new Error(data.statusText);
            error.status = data.status;
            error.system = 'Repo';
            throw error;
        })
        .catch(e => {
            console.sys(e);
            throw e;
        });
}