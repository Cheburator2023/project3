const sql = `
/*
Запрос для отчета "Список моделей"
*/
select
  m_.root_model_id,
  m_.model_id as model_version_id,
  m_.model_name,
  m_.model_version,
  m_.model_desc,
  to_char(
    cast(m_.create_date as date),
    'DD.MM.YYYY'
  ) as model_create_date,
  dv_.department_value,
  clsf_.model_type,
  clsf_.product_and_scope,
  clsf_.model_developing_reasons,
  clsf_.COMPANY_GROUP,
  clsf_.model_algorithm,
  clsf_.using_mode,
  CLSF_.CUSTOMER_DEPT as MODEL_CUSTOMER_DEPT_INFO,
  stat_.status as model_status,
  stat_implementation.status_ as model_status_implementation,
  cast(
    'model' || m_.root_model_id as varchar(4000)
  ) || '-v' || cast(
    m_.model_version as varchar(4000)
  ) as MODEL_ALIAS,
  coalesce(
    dm_.MODEL_CHAR_ID, 'Нет данных'
  ) as MODEL_CHAR_ID,
  coalesce(
    dm_.buiseness_process_name, 'Нет данных'
  ) as BUISENESS_PROCESS_NAME,
  coalesce(
    dm_.target_variable, 'Нет данных'
  ) as TARGET_VARIABLE,
  coalesce(
    dm_.MODEL_SEGMENT, 'Нет данных'
  ) as MODEL_SEGMENT,
  coalesce(
    dm_.DS_DEPARTMENT, 'Нет данных'
  ) as DS_DEPARTMENT,
  coalesce(
    dm_.MODEL_PRIORITY, 'Нет данных'
  ) as MODEL_PRIORITY,
  coalesce(
    to_char(
      cast(
        i_date_.model_int_end_date as date
      ),
      'DD.MM.YYYY'
    ),
    'Нет данных'
  ) as MODEL_INT_END_DATE,
  coalesce(
    case when m_.MODEL_DESC = 'AutoML' then 'Да' else 'Нет' end,
    'Нет'
  ) as MODEL_AUTOML_ATTRIBUTE,
  coalesce(
    case when m_.MODELS_IS_ACTIVE_FLG != '1' then 'Да' else 'Нет' end,
    'Нет'
  ) as MODEL_IS_ARCHIVE_ATTRIBUTE,
  coalesce(
    dm_.model_is_used, 'Нет данных'
  ) as model_is_used,
  coalesce(
    dm_.implementation_decision, 'Нет данных'
  ) as implementation_decision
  -- coalesce(dm_.name_dev_data, 'Нет данных')           as name_dev_data,
  -- coalesce(dm_.id_prod_data, 'Нет данных')            as id_prod_data,
  -- coalesce(dm_.name_prod_data, 'Нет данных')          as name_prod_data,
  -- coalesce(dm_.id_init_valid_data, 'Нет данных')      as id_init_valid_data,
  -- coalesce(dm_.name_init_valid_data, 'Нет данных')    as name_init_valid_data,
  -- coalesce(dm_.id_monit_data, 'Нет данных')           as id_monit_data,
  -- coalesce(dm_.name_monit_data, 'Нет данных')         as name_monit_data
from
  models m_
  left join (
    select
      ar_.model_id,
      STRING_AGG(
        (case when ar_.artefact_id = 173 then av_.artefact_value else null end)::varchar,
        ' > ' ORDER BY
          ar_.artefact_value_id
      ) AS model_type,
      STRING_AGG(
        (case when ar_.artefact_id = 173 then av_.artefact_value_id else null end)::varchar,
        ',' ORDER BY
          ar_.artefact_value_id
      ) AS model_type_id,
      STRING_AGG(
        (case when ar_.artefact_id = 57 then av_.artefact_value else null end)::varchar,
        ' > ' ORDER BY
          ar_.artefact_value_id
      ) AS product_and_scope,
      STRING_AGG(
        (case when ar_.artefact_id = 69 then av_.artefact_value else null end)::varchar,
        ' > ' ORDER BY
          ar_.artefact_value_id
      ) AS model_developing_reasons,
      STRING_AGG(
        (case when ar_.artefact_id = 57 then av_.artefact_value_id else null end)::varchar,
        ',' ORDER BY
          ar_.artefact_value_id
      ) AS product_and_scope_id,
      STRING_AGG(
        (case when ar_.artefact_id = 73 then av_.artefact_value else null end)::varchar,
        ' > ' ORDER BY
          ar_.artefact_value_id
      ) AS COMPANY_GROUP,
      MAX(
        CASE WHEN ar_.ARTEFACT_ID = 6 THEN ARTEFACT_VALUE ELSE NULL END
      ) AS CUSTOMER_DEPT,
      MAX(
        CASE WHEN ar_.ARTEFACT_ID = 781 THEN ARTEFACT_VALUE ELSE NULL END
      ) AS model_algorithm,
      MAX(
        CASE WHEN ar_.ARTEFACT_ID = 61 THEN ARTEFACT_VALUE ELSE NULL END
      ) AS using_mode
    from
      artefact_realizations ar_
      inner join artefact_values av_ on ar_.artefact_value_id = av_.artefact_value_id
      and av_.is_active_flg = '1'
    where
      ar_.artefact_id in (173, 57, 69, 73, 6, 67, 781, 61)
      and ar_.effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      )
    group by
      ar_.model_id
  ) clsf_ on m_.model_id = clsf_.model_id
  left join (
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
          row_number() over (
            partition by t1.model_id
            order by
              t1.effective_from desc
          ) as rnrn_
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
                  row_number() over (
                    partition by bbbiii.model_id
                    order by
                      bbbiii.effective_to desc,
                      bbbiii.effective_from desc
                  ) as rn_
                from
                  bpmn_instances bbbiii
                  inner join bpmn_processes bbbppp on bbbiii.bpmn_key_id = bbbppp.bpmn_key_id
              ) bbii
            where
              bbii.rn_ = 1
          ) t1
      ) t2
    where
      t2.rnrn_ = 1
  ) stat_ on m_.model_id = stat_.model_id
  left join (
    SELECT model_id,
        STRING_AGG(status, ';' ORDER BY status)
        as status_
        FROM (
        SELECT model_id,
            CASE
                WHEN artefact_id = 52
                    AND artefact_string_value = 'Нет, доработки не актуальны'
                    THEN 'Модель не эффективна в бизнес-процессе'
                WHEN artefact_id = 174
                    AND (artefact_string_value is null OR artefact_string_value = 'false')
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 201
                    AND (artefact_value_id IN (313, 314, 315))
                    THEN artefact_string_value
                WHEN artefact_id = 367
                    AND (artefact_value_id IN (519))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 373
                    AND (artefact_value_id IN (411))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 323
                    AND (artefact_value_id IN (426))
                    THEN 'Архив'
                WHEN artefact_id = 351
                    AND (artefact_value_id IN (399))
                    THEN 'Архив'
                WHEN artefact_id = 152
                    AND (artefact_value_id IN (35))
                    THEN 'Архив'
                WHEN artefact_id = 323
                    AND (artefact_value_id IN (427))
                    THEN 'Разработана, не внедрена'
                WHEN (artefact_id = 780 OR artefact_id = 779)
                    AND artefact_string_value = 'true'
                    THEN 'Вывод модели из эксплуатации'
                END AS status
        FROM artefact_realizations
        WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
    ) as dummy
    GROUP BY model_id
  ) stat_implementation on m_.model_id = stat_implementation.model_id
  left join (
    select
      model_id,
      date_trunc(
          'day',
          case when effective_to = TO_TIMESTAMP(
            '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
          ) then null else effective_to end
      )::date as model_int_end_date,
      row_number() over (
        partition by model_id
        order by
          effective_to desc
      ) as r_num
    from
      bpmn_instances
    where
      bpmn_key_id = 9
  ) i_date_ on m_.model_id = i_date_.model_id
  and i_date_.r_num = 1
  left join (
    select
      model_id,
      MAX(
        CASE WHEN ARTEFACT_ID = 54 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS MODEL_CHAR_ID,
      MAX(
        CASE WHEN ARTEFACT_ID = 59 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS buiseness_process_name,
      MAX(
        CASE WHEN ARTEFACT_ID = 60 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS target_variable,
      max(
        case when artefact_id = 58 then artefact_string_value else null end
      ) as MODEL_SEGMENT,
      MAX(
        CASE WHEN ARTEFACT_ID = 7 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS DS_DEPARTMENT,
      MAX(
        CASE WHEN ARTEFACT_ID = 67 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS MODEL_PRIORITY,
      MAX(
        CASE WHEN ARTEFACT_ID = 782 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS model_is_used,
      MAX(
        CASE WHEN ARTEFACT_ID = 783 THEN ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS implementation_decision
    from
      artefact_realizations
    where
      effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      )
      and artefact_id in (7, 54, 58, 59, 60, 67, 782,783)
    group by
      model_id
  ) dm_ on m_.model_id = dm_.model_id
  left join (
    select
      m.model_id,
      max(
        case when ar.artefact_id = 7 then av.artefact_value else null end
      ) as department_value
    from
      models m
      inner join ARTEFACT_REALIZATIONS ar on m.model_id = ar.model_id
      and ar.effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      )
      and ar.artefact_id in (6, 7, 83)
      left join ARTEFACT_VALUES av on ar.artefact_id = av.artefact_id
      and ar.artefact_value_id = av.artefact_value_id
    group by
      m.model_id
  ) dv_ on m_.model_id = dv_.model_id
  left join (
    select
      model_id,
      STRING_AGG(
        case when ah.FUNCTIONAL_ROLE = 'business_customer' then ah.ASSIGNEE_NAME else null end,
        ', ' ORDER BY
          ah.ASSIGNEE_NAME
      ) AS bc_name
    from
      assignee_hist ah
    where
      functional_role = 'business_customer'
      and effective_to = to_timestamp(
        '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
      )
    group by
      ah.model_id
  ) mipmname_ on m_.model_id = mipmname_.model_id

where (
    :includes_archive_models = '0'
    and m_.models_is_active_flg::integer = 1
    or :includes_archive_models = '1'
  )
  and (
    upper(m_.model_name) like '%' || upper(:model_tmpl) || '%'
    or :model_tmpl is null
    or :model_tmpl = ''
  )
  and (
    :includes_automl_models = '0'
    and m_.MODEL_DESC not like 'AutoML'
    or :includes_automl_models = '1'
  )
  and (
    :cust_tmpl::text is null
    or (
      upper(mipmname_.BC_NAME) IN (
        SELECT distinct upper(unnest(string_to_array(:cust_tmpl, ','))) as filter_id
      )
    )
  )
  and (
    :model_priority_template::text is null
    or clsf_.model_id in (
      select
        distinct fct.model_id
      from
        (
          select
            ar.model_id,
            ar.artefact_value_id
          from
            artefact_realizations ar
            inner join models m on ar.model_id = m.model_id
            and m.models_is_active_flg = '1'
          where
            ar.artefact_id = 67
            and ar.effective_to = to_timestamp(
              '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
            )
        ) fct
        inner join (
          SELECT unnest(string_to_array(:model_priority_template, ','))::numeric as filter_id
        ) flt on fct.artefact_value_id = flt.filter_id
    )
  )
  and (
    :model_type_id_filter::text is null
    or clsf_.model_id in (
      select
        distinct fct.model_id
      from
        (
          select
            ar.model_id,
            ar.artefact_value_id
          from
            artefact_realizations ar
            inner join models m on ar.model_id = m.model_id
            and m.models_is_active_flg = '1'
          where
            ar.artefact_id = 173
            and ar.effective_to = to_timestamp(
              '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
            )
        ) fct
        inner join (
          SELECT unnest(string_to_array(:model_type_id_filter, ','))::numeric as filter_id
        ) flt on fct.artefact_value_id = flt.filter_id
    )
  )
  and (
    :company_group_id_filter::text is null
    or clsf_.model_id in (
      select
        distinct fct.model_id
      from
        (
          select
            ar.model_id,
            ar.artefact_value_id
          from
            artefact_realizations ar
            inner join models m on ar.model_id = m.model_id
            and m.models_is_active_flg = '1'
          where
            ar.artefact_id = 73
            and ar.effective_to = to_timestamp(
              '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
            )
        ) fct
        inner join (
          SELECT unnest(string_to_array(:company_group_id_filter, ','))::numeric as filter_id
        ) flt on fct.artefact_value_id = flt.filter_id
    )
  )
  and (
    :product_and_scope_id_filter::text is null
    or clsf_.model_id in (
      select
        distinct fct.model_id
      from
        (
          select
            ar.model_id,
            ar.artefact_value_id
          from
            artefact_realizations ar
            inner join models m on ar.model_id = m.model_id
            and m.models_is_active_flg = '1'
          where
            ar.artefact_id = 57
            and ar.effective_to = to_timestamp(
              '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
            )
        ) fct
        inner join (
            SELECT unnest(string_to_array(:product_and_scope_id_filter, ','))::numeric as filter_id
        ) flt on fct.artefact_value_id = flt.filter_id
    )
  )
  and (
    :model_developing_reasons::text is null
    or clsf_.model_id in (
      select
        distinct fct.model_id
      from
        (
          select
            ar.model_id,
            ar.artefact_value_id
          from
            artefact_realizations ar
            inner join models m on ar.model_id = m.model_id
            and m.models_is_active_flg = '1'
          where
            ar.artefact_id = 69
            and ar.effective_to = to_timestamp(
              '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
            )
        ) fct
        inner join (
          SELECT unnest(string_to_array(:model_developing_reasons, ','))::numeric as filter_id
        ) flt on fct.artefact_value_id = flt.filter_id
    )
  )
  and (
    :model_ds_departments::text is null
    or clsf_.model_id in (
      select
        distinct fct.model_id
      from
        (
          select
            ar.model_id,
            ar.artefact_value_id
          from
            artefact_realizations ar
            inner join models m on ar.model_id = m.model_id
            and m.models_is_active_flg = '1'
          where
            ar.artefact_id = 7
            and ar.effective_to = to_timestamp(
              '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
            )
        ) fct
        inner join (
            SELECT unnest(string_to_array(:model_ds_departments, ','))::numeric as filter_id
        ) flt on fct.artefact_value_id = flt.filter_id
    )
)
`;

module.exports = sql;
