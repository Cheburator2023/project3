const sql = `
/*
bc_department_list - список бизнес-заказчиков
all_bc_department_flg - флаг выбора всех бизнес-заказчиков ('1' = выбрать всех, '0' = выбрать из списка)
*/
	
	
with models_fltr as (
select 
	root_model_id,
	model_id,
	model_name,
	model_desc,
	model_version,
	create_date,
	update_date,
	update_author,
	bpmn_instance_id,
	parent_model_id,
	models_is_active_flg
from models 
where models_is_active_flg = '1'
	and model_id not in 
		(
		select distinct model_id 
		from 
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
			) as dummy
		where status = 'Модель не эффективна в бизнес-процессе'
		)
)
select 
	mipmname_.bc_name,
	mxmipm_.bc_department_name,
	mxmipm_num_.num_of_models as num_of_models_by_bc_department,
	'model' || m_.root_model_id || '-v' || m_.model_version as model_alias,
	m_.model_id,
	m_.model_name,
	to_char(cast(m_.create_date as date), 'DD.MM.YYYY') as create_date,
	stat_.status AS model_status
from models_fltr m_
inner join 
	(
	select 
		model_id,
		artefact_string_value as bc_department_name
	from artefact_realizations 
	where artefact_id = 6
		and effective_to = to_timestamp('9999-12-3123:59:59','yyyy-mm-ddhh24:mi:ss')
		and 
			(
				artefact_string_value in 
					(
            SELECT unnest(string_to_array(:bc_department_list, ',')) as bc_department_name
          )
			or :all_bc_department_flg = '1'
			)
		and artefact_string_value is not null 
		
	union all 	
	
	select 
		m.model_id,
		'Значение департамента не выбрано' as bc_department_name
	from models_fltr m 
	where m.model_id not in (select distinct model_id from artefact_realizations where artefact_id = 6)
		and :all_bc_department_flg = '1'
	) mxmipm_
	on m_.model_id = mxmipm_.model_id
left join 
	(
	select 
		model_id,
		STRING_AGG(
        assignee_name::varchar,
        ', ' ORDER BY effective_from
    ) AS bc_name
	from assignee_hist 
	where functional_role = 'business_customer'
		and effective_to = to_timestamp('9999-12-3123:59:59','yyyy-mm-ddhh24:mi:ss')
	group by model_id
	) mipmname_
	on m_.model_id = mipmname_.model_id
inner join 
	(
	select 
		artefact_string_value as bc_department_name,
		count(distinct model_id) as num_of_models
	from artefact_realizations 
	where artefact_id = 6
		and effective_to = to_timestamp('9999-12-3123:59:59','yyyy-mm-ddhh24:mi:ss')
		and artefact_string_value is not null 
		and model_id in (select distinct model_id from models_fltr)
	group by artefact_string_value
	
	union all 	
	
	select 
		'Значение департамента не выбрано' as bc_department_name,
		count(*) as num_of_models
	from models_fltr m 
	where m.model_id not in (select distinct model_id from artefact_realizations where artefact_id = 6)
	group by 1
	
	) mxmipm_num_
	on mxmipm_.bc_department_name = mxmipm_num_.bc_department_name
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
order by 
	mxmipm_.bc_department_name asc, 
	mipmname_.bc_name asc, 
	m_.create_date asc
`

module.exports = sql
