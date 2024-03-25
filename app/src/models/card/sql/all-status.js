const sql = `
select 
  distinct st_.STATUS as model_status 
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
) st_ 
`

module.exports = sql
