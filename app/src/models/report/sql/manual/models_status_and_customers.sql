select m_.root_model_id,
       m_.model_id,
       m_.model_name,
       m_.model_version,
       m_.model_desc,
       to_char(cast(m_.create_date as date), 'DD.MM.YYYY') as model_create_date,
       d_.department,
       dv_.department_value,
       clsf_.model_type,
       clsf_.product_and_scope,
       stat_.status as model_status
from models m_
left join
	(
		select
			ar_.model_id,
			LISTAGG(case when ar_.artefact_id = 173 then av_.artefact_value else null end, ' > ') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS model_type,
			LISTAGG(case when ar_.artefact_id = 173 then av_.artefact_value_id else null end, ',') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS model_type_id,
			LISTAGG(case when ar_.artefact_id = 57 then av_.artefact_value else null end, ' > ') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS product_and_scope,
			LISTAGG(case when ar_.artefact_id = 57 then av_.artefact_value_id else null end, ',') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS product_and_scope_id
		from artefact_realizations ar_
		inner join artefact_values av_
			on ar_.artefact_value_id = av_.artefact_value_id
				and av_.is_active_flg = '1'
		where ar_.artefact_id in (173, 57)
			and ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
		group by ar_.model_id
	) clsf_
	on m_.model_id = clsf_.model_id
left join
(
		select
			t2.model_id,
			t2.status_ as STATUS,
			t2.effective_from
		from
		(
			select
				t1.model_id,
				t1.status_,
				t1.effective_from,
				row_number() over(partition by t1.model_id order by t1.effective_from desc) as rnrn_
			from
			(
				select
					bbii.model_id,
					bbii.bpmn_key_desc as status_,
					bbii.effective_from
				from
					(
					select
						bbbiii.model_id,
						bbbppp.bpmn_key_desc,
						bbbiii.bpmn_key_id,
						bbbiii.effective_from,
						row_number() over (partition by bbbiii.model_id order by bbbiii.effective_to desc, bbbiii.effective_from desc) as rn_
					from bpmn_instances bbbiii
					inner join bpmn_processes bbbppp
						on bbbiii.bpmn_key_id = bbbppp.bpmn_key_id
					) bbii
					where bbii.rn_ = 1


			union all

			select
				status_2_.model_id,
				status_2_.status_,
				status_2_.effective_from
			from
				(
					select
						ar_.model_id,
						case
							when ar_.artefact_id = 52 and ar_.artefact_string_value = 'Нет, доработки не актуальны' then 'Модель не эффективна в бизнес-процессе'
							when ar_.artefact_id = 174 and ( ar_.artefact_string_value is null or ar_.artefact_string_value = 'false' ) then 'Модель разработана, не внедрена'
							when ar_.artefact_id = 201 and ( ar_.artefact_value_id in (314, 315) ) then ar_.artefact_string_value
							WHEN ar_.artefact_id = 367 AND (ar_.artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
							WHEN ar_.artefact_id = 373 AND (ar_.artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
							WHEN ar_.artefact_id = 323 AND (ar_.artefact_value_id IN (426)) THEN 'Архив'
							WHEN ar_.artefact_id = 351 AND (ar_.artefact_value_id IN (399)) THEN 'Архив'
							WHEN ar_.artefact_id = 152 AND (ar_.artefact_value_id IN (35)) THEN 'Архив'
                    		WHEN ar_.artefact_id = 323 AND (ar_.artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
							else NULL
						end as status_,
						ar_.effective_from,
						row_number() over (partition by ar_.model_id order by ar_.effective_from desc) as r_num
					from artefact_realizations ar_
					where ar_.artefact_id in (52, 201, 174, 367, 373, 323,351,152)
						and ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
						and case
							when ar_.artefact_id = 52 and ar_.artefact_string_value = 'Нет, доработки не актуальны' then 'Модель не эффективна в бизнес-процессе'
							when ar_.artefact_id = 174 and ( ar_.artefact_string_value is null or ar_.artefact_string_value = 'false' ) then 'Модель разработана, не внедрена'
							when ar_.artefact_id = 201 and ( ar_.artefact_value_id in (314, 315) ) then ar_.artefact_string_value
							WHEN ar_.artefact_id = 367 AND (ar_.artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
							WHEN ar_.artefact_id = 373 AND (ar_.artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
							WHEN ar_.artefact_id = 323 AND (ar_.artefact_value_id IN (426)) THEN 'Архив'
							WHEN ar_.artefact_id = 351 AND (ar_.artefact_value_id IN (399)) THEN 'Архив'
							WHEN ar_.artefact_id = 152 AND (ar_.artefact_value_id IN (35)) THEN 'Архив'
                    		WHEN ar_.artefact_id = 323 AND (ar_.artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
							else NULL
						end is not NULL
				) status_2_
				where status_2_.r_num = 1
			) t1
		) t2
		where t2.rnrn_ = 1
	) stat_
	on m_.model_id = stat_.model_id
left join
	(
		select m.model_id,
			   max(case when ar.artefact_id = 7 then av.artefact_value else null end) as department_value
		from models m
				 inner join ARTEFACT_REALIZATIONS ar
							on m.model_id = ar.model_id
								and ar.effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
								and ar.artefact_id in (6, 7, 83)
				 left join ARTEFACT_VALUES av
						   on ar.artefact_id = av.artefact_id
							   and ar.artefact_value_id = av.artefact_value_id
		group by m.model_id
	) dv_
		on m_.model_id = dv_.model_id
left join
	(
		select m.model_id, av.artefact_value as department
		from models m
        inner join ARTEFACT_REALIZATIONS ar
            on m.model_id = ar.model_id
                and ar.effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                and ar.artefact_id = 6
        left join ARTEFACT_VALUES av
           on ar.artefact_id = av.artefact_id
               and ar.artefact_value_id = av.artefact_value_id
	) d_
		on m_.model_id = d_.model_id
where m_.models_is_active_flg = '1' and m_.MODEL_DESC != 'AutoML';

