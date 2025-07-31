// Возвращает два статуса модели: по артефактам и по схеме камунды

const status = require("./status");

const sql = `
    SELECT
        m.model_status as camunda_model_status,
        st.status as artefacts_model_status,
    FROM
        models m
    LEFT JOIN (${status}) st
        ON st.model_id = m.model_id
    WHERE
       m.model_id = :model_id
`;

module.exports = sql;
