const connector = require('./connector')

class Repo {

    create = (general_model_id, model_name, model_id, model_desc, ds_department) => connector({
        path: 'repo/create',
        method: 'POST',
        data: {
            general_model_id,
            model_name,
            model_id,
            model_desc,
            ds_department,
        }
    })

    status = (general_model_id, model_id) => connector({
        path: 'repo/status',
        method: 'GET',
        data: {
            general_model_id,
            model_id,
        }
    })

}

module.exports = Repo