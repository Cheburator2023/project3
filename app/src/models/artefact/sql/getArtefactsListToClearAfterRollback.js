const sql = `
SELECT DISTINCT ON (ta.artefact_id) 
	ta.artefact_id
FROM tasks_artefacts ta 
JOIN artefact_realizations ar ON 
	ar.artefact_id = ta.artefact_id 
	AND ar.model_id = :model_id 
	AND ar.effective_to = '9999-12-31 23:59:59.000'
LEFT JOIN tasks_artefacts tata ON 
	tata.artefact_id = ta.artefact_id 
	AND tata.task_id <> ta.task_id 
	AND tata.task_id = ANY (:completed_task_ids::text[])
	AND tata.deployment_id = :deployment_id
WHERE ta.task_id = ANY (:rolled_task_ids::text[]) 
	AND tata.task_id is null
	AND ta.deployment_id = :deployment_id
`;

module.exports = sql;