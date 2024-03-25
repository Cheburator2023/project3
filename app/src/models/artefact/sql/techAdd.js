const sql = `
WITH cte as (
    SELECT :model_id                       as model_id,
           artefact_id::numeric(38)        as artefact_id,
           :artefact_value_id::numeric(38) as artefact_value_id,
           :artefact_string_value          as artefact_string_value
    FROM artefacts
    WHERE artefact_tech_label = :artefact_tech_label
),
     upsert AS (
         UPDATE artefact_realizations as ar_re
             SET
                 artefact_value_id = ar.artefact_value_id,
                 artefact_string_value = ar.artefact_string_value
             FROM (SELECT * FROM cte) AS ar
             WHERE ar_re.artefact_id = ar.artefact_id
                 AND ar_re.model_id = ar.model_id
             RETURNING *
     )
INSERT
INTO artefact_realizations (artefact_id, model_id, artefact_value_id, artefact_string_value)
SELECT artefact_id, model_id, artefact_value_id, artefact_string_value from cte
WHERE NOT EXISTS(
        SELECT * FROM upsert
    )
`;

module.exports = sql
