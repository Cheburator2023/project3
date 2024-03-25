const sql = `
/*
Запрос для отчета по валидации
rep_date_from, rep_date_to - границы формирования отчета по датам создания модели
status_filter - фильтр на статусы модели (список)
product_and_scope_id_filter - фильтр на продукт и область применения (могут быть значения формата 35,67,135 - скорее всего, нужно переделывать на поиск по подстроке, чтобы при выборе верхнего этажа дерева показывались нижние)
model_type_id_filter - фильтр на тип модели (могут быть значения формата 35,67,135 - скорее всего, нужно переделывать на поиск по подстроке, чтобы при выборе верхнего этажа дерева показывались нижние)
val_type_filter - тип последней валидации ('Первичная валидация'/'Плановая валидация')
val_results_filter - результаты последней валидации ('Выявлены отклонения при валидации'/'Валидация пройдена успешно')

все фильтры, кроме дат, могут принимать NULL и НЕ фильтровать
*/

select
--to_date(cast(:rep_date_from as varchar2(4000)), 'YYYY-MM-DD') as test_date,
--to_date(trunc(m_.create_date)) as test_date_2,
--case when to_date(cast(:rep_date_from as varchar2(4000)), 'YYYY-MM-DD') < to_date(trunc(m_.create_date)) then 1 else 0 end as test_case,
--case when to_date(trunc(m_.create_date)) between to_date(cast(:rep_date_from as varchar2(4000)), 'YYYY-MM-DD') and to_date(cast(:rep_date_to as varchar2(4000)), 'YYYY-MM-DD')  then 1 else 0 end as test_case_2,
m_.root_model_id,
m_.model_id,
m_.model_name,
m_.model_version,
m_.model_desc,
clsf_.model_type,
case
    when get_count(clsf_.model_type, '>') = 0
        then clsf_.model_type
    else substr(clsf_.model_type, 1, instr(clsf_.model_type, '>', 1, 1) - 2)
    end
                                                                as model_type_lev1,
case
    when get_count(clsf_.model_type, '>') = 1
        then substr(clsf_.model_type, instr(clsf_.model_type, '>', 1, 1) + 2)
    when get_count(clsf_.model_type, '>') = 2
        then substr(clsf_.model_type, instr(clsf_.model_type, '>', 1, 1) + 2,
                    instr(clsf_.model_type, '>', 1, 2) - instr(clsf_.model_type, '>', 1, 1) - 3)
    else null
    end                                                         as model_type_lev2,
case
    when get_count(clsf_.model_type, '>') = 2
        then substr(clsf_.model_type, instr(clsf_.model_type, '>', 1, 2) + 2)
    else null
    end                                                         as model_type_lev3,
clsf_.model_type_id,
clsf_.product_and_scope,
clsf_.product_and_scope_id,
coalesce(status_2_.buss_status, status_.bpmn_key_desc)          AS model_status,
to_char(cast(m_date_.model_dev_end_date as date), 'DD.MM.YYYY') as model_dev_end_date,
to_char(cast(i_date_.model_int_end_date as date), 'DD.MM.YYYY') as model_int_end_date,
to_char(cast(v_date_.model_val_date as date), 'DD.MM.YYYY')     as model_val_date,
coalesce(v_res_.val_type, 'Нет данных')                         as val_type,
coalesce(v_res_.val_results, 'Нет данных')                      as val_results
from models m_
         left join
     (
         select ar_.model_id,
                STRING_AGG((case when ar_.artefact_id = 173 then av_.artefact_value else null end)::varchar,
                           ' > ' ORDER BY ar_.artefact_value_id) AS model_type,
                STRING_AGG((case when ar_.artefact_id = 173 then av_.artefact_value_id else null end)::varchar, ','
                           ORDER BY ar_.artefact_value_id)
                                                                 AS model_type_id,
                STRING_AGG((case when ar_.artefact_id = 57 then av_.artefact_value else null end)::varchar, ' > '
                           ORDER BY ar_.artefact_value_id)
                                                                 AS product_and_scope,
                STRING_AGG((case when ar_.artefact_id = 57 then av_.artefact_value_id else null end)::varchar, ','
                           ORDER BY ar_.artefact_value_id)
                                                                 AS product_and_scope_id
         from artefact_realizations ar_
                  inner join artefact_values av_ on ar_.artefact_value_id = av_.artefact_value_id
             and av_.is_active_flg = '1'
         where ar_.artefact_id in (173, 57)
           and ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
         group by ar_.model_id
     ) clsf_ on m_.model_id = clsf_.model_id
         left join
     (
         select bbii.model_id,
                bbii.bpmn_key_desc
         from (
                  select bbbiii.model_id,
                         bbbppp.bpmn_key_desc,
                         bbbiii.bpmn_key_id,
                         row_number() over (partition by bbbiii.model_id order by bbbiii.effective_from desc) as rn_
                  from bpmn_instances bbbiii
                           inner join bpmn_processes bbbppp
                                      on bbbiii.bpmn_key_id = bbbppp.bpmn_key_id
                                          and bbbiii.effective_to =
                                              TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
              ) bbii
         where bbii.rn_ = 1
     ) status_ on m_.model_id = status_.model_id
         left join
     (
         select model_id,
                case
                    when artefact_id = 52 and artefact_value_id = 16 then 'Модель не эффективна в бизнес-процессе'
                    when artefact_id = 174 and artefact_string_value is null then 'Модель разработана, не внедрена'
                    when artefact_id = 201 and artefact_string_value is null then 'Модель внедряется вне ПИМ'
                    WHEN artefact_id = 367 AND (artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
                    WHEN artefact_id = 373 AND (artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
                    WHEN artefact_id = 323 AND (artefact_value_id IN (426)) THEN 'Архив'
                    WHEN artefact_id = 351 AND (artefact_value_id IN (399)) THEN 'Архив'
                    WHEN artefact_id = 152 AND (artefact_value_id IN (35)) THEN 'Архив'
                    WHEN artefact_id = 323 AND (artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
                    else NULL
                    end                                                                             as buss_status,
                row_number() over (partition by model_id order by effective_from, artefact_id desc) as r_num
         from artefact_realizations
         where artefact_id in (52, 201, 174, 367, 373, 323, 351, 152)
           and effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
           and case
                   when artefact_id = 52 and artefact_value_id = 16 then 'Модель не эффективна в бизнес-процессе'
                   when artefact_id = 174 and artefact_string_value is null then 'Модель разработана, не внедрена'
                   when artefact_id = 201 and artefact_string_value is null then 'Модель внедряется вне ПИМ'
                   WHEN artefact_id = 367 AND (artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
                   WHEN artefact_id = 373 AND (artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
                   WHEN artefact_id = 323 AND (artefact_value_id IN (426)) THEN 'Архив'
                   WHEN artefact_id = 351 AND (artefact_value_id IN (399)) THEN 'Архив'
                   WHEN artefact_id = 152 AND (artefact_value_id IN (35)) THEN 'Архив'
                   WHEN artefact_id = 323 AND (artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
                   else NULL end is not NULL
     ) status_2_ on m_.model_id = status_2_.model_id
         and status_2_.r_num = 1
         left join
     (
         select model_id,
                date_trunc('day',
                           case
                               when effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                                   then null
                               else effective_to end)::date                          as model_dev_end_date,
                row_number() over (partition by model_id order by effective_to desc) as r_num
         from bpmn_instances
         where bpmn_key_id = 7
     ) m_date_ on m_.model_id = m_date_.model_id
         and m_date_.r_num = 1
         left join
     (
         select model_id,
                date_trunc('day',
                           case
                               when effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                                   then null
                               else effective_to end)::date                          as model_int_end_date,
                row_number() over (partition by model_id order by effective_to desc) as r_num
         from bpmn_instances
         where bpmn_key_id = 9
     ) i_date_ on m_.model_id = i_date_.model_id
         and i_date_.r_num = 1
         left join
     (
         select model_id,
                date_trunc('day',
                           case
                               when effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                                   then null
                               else effective_to end)::date                                       as model_val_date,
                row_number() over (partition by model_id order by case
                                                                      when effective_to =
                                                                           TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
                                                                          then null
                                                                      else effective_to end desc) as r_num
         from bpmn_instances
         where bpmn_key_id = 8
     ) v_date_ on m_.model_id = v_date_.model_id
         and v_date_.r_num = 1
         left join
     (
         select model_id,
                max(case
                        when artefact_id = 96 and artefact_value_id = 175 then 'Плановая валидация'
                        else 'Первичная валидация' end)                               as val_type,
                max(cast(case
                             when artefact_id = 151 and artefact_string_value = 'true'
                                 then 'Выявлены отклонения при валидации'
                             else 'Валидация пройдена успешно' end as varchar(4000))) as val_results
         from artefact_realizations
         where artefact_id in (96, 151)
           and effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
         group by model_id
     ) v_res_ on m_.model_id = v_res_.model_id
where m_.models_is_active_flg = '1'
  and (date_trunc('day', m_.create_date)::date between to_date(cast(:rep_date_from as varchar(4000)), 'YYYY-MM-DD') and to_date(cast(:rep_date_to as varchar(4000)), 'YYYY-MM-DD'))
  and (
            coalesce(status_2_.buss_status, status_.bpmn_key_desc) in
            (
                SELECT unnest(string_to_array(:status_filter, ',')) as status_filter
            )
        or :status_filter is null)
  and (
            substr(clsf_.product_and_scope_id, 1, length(:product_and_scope_id_filter)) in
            (:product_and_scope_id_filter) /* здесь нужно будет думать, как организовать поиск по подстроке */
        or :product_and_scope_id_filter is null
    )
  and (
            substr(clsf_.model_type_id, 1, length(:model_type_id_filter)) in
            (:model_type_id_filter) /* здесь нужно будет думать, как организовать поиск по подстроке */
        or :model_type_id_filter is null
    )
  and (
            coalesce(v_res_.val_type, 'Нет данных') in
            (
                SELECT unnest(string_to_array(:val_type_filter, ',')) as val_type
            ) /* просто список из 'Первичная валидация'/'Плановая валидация' */
        or :val_type_filter is null)
  and (
            coalesce(v_res_.val_results, 'Нет данных') in
            (
                SELECT unnest(string_to_array(:val_results_filter, ',')) as val_type
            ) /* просто список из 'Выявлены отклонения при валидации'/'Валидация пройдена успешно'  */
        or :val_results_filter is null)
`

module.exports = sql
