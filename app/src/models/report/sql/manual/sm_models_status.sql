WITH FILTER_model_id AS (
	SELECT model_id, LISTAGG(status, ', ') WITHIN GROUP (ORDER BY status) as STATUS
	FROM
		(
		SELECT bi.model_id, bp.bpmn_key_desc as status
		FROM bpmn_instances bi
		JOIN bpmn_processes bp
		    ON bi.bpmn_key_id = bp.bpmn_key_id
		WHERE bi.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
		 
		UNION ALL

		SELECT
			model_id,
			CASE
				WHEN artefact_id = 174 AND (artefact_string_value is null OR artefact_string_value = 'false') THEN 'Модель разработана, не внедрена'
				WHEN artefact_id = 201 AND (artefact_value_id IN (314, 315)) THEN artefact_string_value
				WHEN artefact_id = 367 AND (artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
				WHEN artefact_id = 373 AND (artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
				WHEN artefact_id = 323 AND (artefact_value_id IN (426)) THEN 'Архив'
				WHEN artefact_id = 323 AND (artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
			END AS st
		FROM artefact_realizations
		WHERE
			effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
			AND
				(
				artefact_id = 174 and (artefact_string_value is null or artefact_string_value = 'false')
				OR artefact_id = 201 and (artefact_value_id in (314, 315)) 
				OR artefact_id = 367 AND (artefact_value_id IN (519))
				OR artefact_id = 373 AND (artefact_value_id IN (411))
				OR artefact_id = 323 AND (artefact_value_id IN (426, 427))
				)
		)
	GROUP BY model_id
	), A AS (
	    SELECT DISTINCT m.model_id,
			m.model_name,
			m.model_desc,
			m.model_version,
	        fm.STATUS STATUS,
			ar.artefact_string_value ARTEFACTS
		FROM models m
		JOIN artefact_realizations ar
    ON m.model_id = ar.model_id
	    JOIN FILTER_model_id fm
	        on m.MODEL_ID = fm.MODEL_ID
		WHERE MODEL_DESC != 'AutoML'
		    AND ar.artefact_id IN (63,57,239,240,61,7)
			AND m.model_id  IN (SELECT model_id FROM FILTER_model_id)
		 )

	SELECT  model_id,
		model_name, 
		model_desc,
	    model_version,
	    STATUS,
	    LISTAGG(ARTEFACTS, ', ') WITHIN GROUP (ORDER BY ARTEFACTS) as ATREFACTS
	FROM  A
	GROUP BY model_id, model_name, model_desc, model_version, STATUS;