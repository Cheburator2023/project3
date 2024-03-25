const sql = `
select
    row_number() over (
      order by
        m_.root_model_id,
        m_.model_version
    ) as R_NUM,
    coalesce(
      CLSF_.COMPANY_GROUP, 'Нет данных'
    ) as COMPANY_GROUP,
    coalesce(
      TO_CHAR(
        M_UPD_DATE.UPDATE_DATE, 'DD.MM.YYYY'
      ),
      'Нет данных'
    ) AS UPDATE_DATE,
    M_.MODEL_NAME,
    M_.ROOT_MODEL_ID,
    M_.MODEL_VERSION,
    M_.MODEL_ID,
    clsf_.integration_decree_date,
    coalesce(
      CLSF_.DS_DEPARTMENT, 'Нет данных'
    ) as DS_DEPARTMENT,
    --cast(m_.root_model_id as varchar(4000 char)) || '-v' || cast(m_.model_version as varchar(4000 char)) as sys_model_id,
    coalesce(
      case when get_count(clsf_.model_type, '>') = 0 then clsf_.model_type else substr(
        clsf_.model_type,
        1,
        instr(clsf_.model_type, '>', 1, 1) -2
      ) end,
      'Нет данных'
    ) as MODEL_TYPE_LEV1,
    coalesce(
      case when get_count(clsf_.model_type, '>') = 1 then substr(
        clsf_.model_type,
        instr(clsf_.model_type, '>', 1, 1) + 2
      ) when get_count(clsf_.model_type, '>') = 2 then substr(
        clsf_.model_type,
        instr(clsf_.model_type, '>', 1, 1) + 2,
        instr(clsf_.model_type, '>', 1, 2) - instr(clsf_.model_type, '>', 1, 1) -3
      ) else null end,
      'Нет данных'
    ) as MODEL_TYPE_LEV2,
    coalesce(
      clsf_.product_and_scope, 'Нет данных'
    ) as PRODUCT_AND_SCOPE,
    coalesce(
      clsf_.MODEL_SEGMENT, 'Нет данных'
    ) as MODEL_SEGMENT,
    coalesce(
      clsf_.MODEL_CHAR_ID, 'Нет данных'
    ) as MODEL_CHAR_ID,
    coalesce(
      clsf_.buiseness_process_name, 'Нет данных'
    ) as BUISENESS_PROCESS_NAME,
    coalesce(
      clsf_.target_variable, 'Нет данных'
    ) as TARGET_VARIABLE,
    cast(
      'model' || m_.root_model_id as varchar(4000)
    ) || '-v' || cast(
      m_.model_version as varchar(4000)
    ) as MODEL_ALIAS,
    coalesce(
      CLSF_.CUSTOMER_DEPT, 'Нет данных'
    ) as MODEL_CUSTOMER_DEPT_INFO,
    coalesce(
      mipmname_.BC_NAME, 'Нет данных'
    ) AS MODEL_CUSTOMER_INFO,
    coalesce(
      CLSF_.MODEL_PRIORITY, 'Нет данных'
    ) as MODEL_PRIORITY,
    coalesce(
      CLSF_.COMPANY_GROUP, 'Нет данных'
    ) as COMPANY_GROUP,
    coalesce(
      CLSF_.model_developing_reasons,
      'Нет данных'
    ) as MODEL_DEVELOPING_REASONS,
    m_.model_desc,
    coalesce(
      case when m_.MODEL_DESC = 'AutoML' then 'Да' else 'Нет' end,
        'Нет'
    ) as MODEL_AUTOML_ATTRIBUTE,
    --coalesce(to_char(cast(m_date_.model_dev_end_date as date), 'DD.MM.YYYY'), 'Нет данных') as model_dev_end_date,
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
      to_char(
        cast(
          r_date_.model_removal_end_date as date
        ),
        'DD.MM.YYYY'
      ),
      'Нет данных'
    ) as MODEL_REMOVAL_END_DATE,
    coalesce(
      to_char(
        cast(
          m_date_.model_dev_end_date as date
        ),
        'DD.MM.YYYY'
      ),
      'Нет данных'
    ) as MODEL_DEV_END_DATE,
    coalesce(
      to_char(
        cast(CLSF_.REPORT_APPR_TIME as date),
        'DD.MM.YYYY'
      ),
      'Нет данных'
    ) as MODEL_REPORT_APPR_DATE --clsf_.model_type_id,
    --clsf_.product_and_scope_id,
    --coalesce(status_2_.buss_status , status_.bpmn_key_desc) AS model_status,
    --to_char(cast(v_date_.model_val_date as date), 'DD.MM.YYYY') as model_val_date,
    --coalesce(v_res_.val_type, 'Нет данных') as val_type,
    --coalesce(v_res_.val_results, 'Нет данных') as val_results
  from
    models m_
    left join (
      select
        ar_.model_id,
        STRING_AGG(
          case when ar_.artefact_id = 173 then av_.artefact_value else null end,
          ' > ' ORDER BY
            ar_.artefact_value_id
        ) AS model_type,
        STRING_AGG(
          (case when ar_.artefact_id = 173 then av_.artefact_value_id else null end)::varchar,
          ',' ORDER BY
            ar_.artefact_value_id
        ) AS model_type_id,
        STRING_AGG(
          case when ar_.artefact_id = 57 then av_.artefact_value else null end,
          ' > ' ORDER BY
            ar_.artefact_value_id
        ) AS product_and_scope,
        STRING_AGG(
          (case when ar_.artefact_id = 57 then av_.artefact_value_id else null end)::varchar,
          ',' ORDER BY
            ar_.artefact_value_id
        ) AS product_and_scope_id,
        STRING_AGG(
          case when ar_.artefact_id = 73 then av_.artefact_value else null end,
          ' > ' ORDER BY
            ar_.artefact_value_id
        ) AS COMPANY_GROUP,
        STRING_AGG(
          (case when ar_.artefact_id = 73 then av_.artefact_value_id else null end)::varchar,
          ',' ORDER BY
            ar_.artefact_value_id
        ) AS COMPANY_GROUP_ID,
        -- MAX(CASE WHEN AR_.ARTEFACT_ID = 73 THEN AV_.ARTEFACT_VALUE ELSE NULL END) AS COMPANY_GROUP,
        -- MAX(CASE WHEN AR_.ARTEFACT_ID = 73 THEN AV_.ARTEFACT_VALUE_ID ELSE NULL END) AS COMPANY_GROUP_ID,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 6 THEN AV_.ARTEFACT_VALUE ELSE NULL END
        ) AS CUSTOMER_DEPT,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 69 THEN AV_.ARTEFACT_VALUE ELSE NULL END
        ) AS model_developing_reasons,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 60 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS target_variable,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 124 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS integration_decree_date,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 67 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS MODEL_PRIORITY,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 7 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS DS_DEPARTMENT,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 58 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS MODEL_SEGMENT,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 54 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS MODEL_CHAR_ID,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 59 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
        ) AS buiseness_process_name,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 44 THEN AR_.EFFECTIVE_FROM ELSE NULL END
        ) AS REPORT_ATTACH_TIME,
        MAX(
          CASE WHEN AR_.ARTEFACT_ID = 52
          AND AR_.ARTEFACT_STRING_VALUE = 'Да' THEN AR_.EFFECTIVE_FROM ELSE NULL END
        ) AS REPORT_APPR_TIME
      from
        artefact_realizations ar_
        left join artefact_values av_ on ar_.artefact_value_id = av_.artefact_value_id
        and av_.is_active_flg = '1'
      where
        (
          nullif(:spicific_date_unloading, '') is not null
          and cast(
            coalesce(
              ar_.effective_from,
              to_timestamp(
                '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
              )
            ) as date
          ) < to_date(
            cast(
              coalesce(
                nullif(:spicific_date_unloading, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
        )
        or (
          nullif(:spicific_date_unloading, '') is null
          and ar_.effective_to = to_timestamp(
            '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
          )
        )
      group by
        ar_.model_id
    ) clsf_ on m_.model_id = clsf_.model_id
    left join (
      select
        bbii.model_id,
        bbii.bpmn_key_desc
      from
        (
          select
            bbbiii.model_id,
            bbbppp.bpmn_key_desc,
            row_number() over (
              partition by bbbiii.model_id
              order by
                bbbiii.effective_from desc
            ) as rn_
          from
            bpmn_instances bbbiii
            inner join bpmn_processes bbbppp on bbbiii.bpmn_key_id = bbbppp.bpmn_key_id
            and bbbiii.effective_to = TO_TIMESTAMP(
              '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
            )
        ) bbii
      where
        bbii.rn_ = 1
    ) status_ on m_.model_id = status_.model_id
    left join (
      select
        model_id,
        case when artefact_id = 52
        and artefact_value_id = 16 then 'Модель не эффективна в бизнес-процессе' when artefact_id = 174
        and artefact_string_value is null then 'Модель разработана, не внедрена' when artefact_id = 201
        and artefact_string_value is null then 'Модель внедряется вне ПИМ' WHEN artefact_id = 367
        AND (
          artefact_value_id IN (519)
        ) THEN 'Разработана, не внедрена' WHEN artefact_id = 373
        AND (
          artefact_value_id IN (411)
        ) THEN 'Разработана, не внедрена' WHEN artefact_id = 323
        AND (
          artefact_value_id IN (426)
        ) THEN 'Архив' WHEN artefact_id = 351
        AND (
          artefact_value_id IN (399)
        ) THEN 'Архив' WHEN artefact_id = 152
        AND (
          artefact_value_id IN (35)
        ) THEN 'Архив' WHEN artefact_id = 323
        AND (
          artefact_value_id IN (427)
        ) THEN 'Разработана, не внедрена' else NULL end as buss_status,
        row_number() over (
          partition by model_id
          order by
            effective_from,
            artefact_id desc
        ) as r_num
      from
        artefact_realizations
      where
        artefact_id in (52, 201, 174, 367, 373, 323, 351, 152)
        and (
          nullif(:spicific_date_unloading, '') is not null
          and cast(
            coalesce(
              effective_from,
              to_timestamp(
                '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
              )
            ) as date
          ) < to_date(
            cast(
              coalesce(
                nullif(:spicific_date_unloading, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
        )
        or (
          nullif(:spicific_date_unloading, '') is null
          and effective_to = to_timestamp(
            '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
          )
        )
        and case when artefact_id = 52
        and artefact_value_id = 16 then 'Модель не эффективна в бизнес-процессе' when artefact_id = 174
        and artefact_string_value is null then 'Модель разработана, не внедрена' when artefact_id = 201
        and artefact_string_value is null then 'Модель внедряется вне ПИМ' WHEN artefact_id = 367
        AND (
          artefact_value_id IN (519)
        ) THEN 'Разработана, не внедрена' WHEN artefact_id = 373
        AND (
          artefact_value_id IN (411)
        ) THEN 'Разработана, не внедрена' WHEN artefact_id = 323
        AND (
          artefact_value_id IN (426)
        ) THEN 'Архив' WHEN artefact_id = 351
        AND (
          artefact_value_id IN (399)
        ) THEN 'Архив' WHEN artefact_id = 152
        AND (
          artefact_value_id IN (35)
        ) THEN 'Архив' WHEN artefact_id = 323
        AND (
          artefact_value_id IN (427)
        ) THEN 'Разработана, не внедрена' else NULL end is not NULL
    ) status_2_ on m_.model_id = status_2_.model_id
    and status_2_.r_num = 1
    left join (
      select
        model_id,
        date_trunc(
          'day',
          case when effective_to = TO_TIMESTAMP(
            '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
          ) then null else effective_to end
        )::date as model_removal_end_date,
        row_number() over (
          partition by model_id
          order by
            effective_to desc
        ) as r_num
      from
        bpmn_instances
      where
        bpmn_key_id = 18
    ) r_date_ on m_.model_id = r_date_.model_id
    and r_date_.r_num = 1
    left join (
      select
        model_id,
        date_trunc(
          'day',
          case when effective_to = TO_TIMESTAMP(
            '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
          ) then null else effective_to end
        )::date as model_dev_end_date,
        row_number() over (
          partition by model_id
          order by
            effective_to desc
        ) as r_num
      from
        bpmn_instances
      where
        bpmn_key_id = 7
    ) m_date_ on m_.model_id = m_date_.model_id
    and m_date_.r_num = 1
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
        date_trunc(
          'day',
          case when effective_to = TO_TIMESTAMP(
            '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
          ) then null else effective_to end
        )::date as model_val_date,
        row_number() over (
          partition by model_id
          order by
            case when effective_to = TO_TIMESTAMP(
              '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
            ) then null else effective_to end desc
        ) as r_num
      from
        bpmn_instances
      where
        bpmn_key_id = 8
    ) v_date_ on m_.model_id = v_date_.model_id
    and v_date_.r_num = 1
    left join (
      select
        model_id,
        max(
          case when artefact_id = 96
          and artefact_value_id = 175 then 'Плановая валидация' else 'Первичная валидация' end
        ) as val_type,
        max(
          cast(
            case when artefact_id = 151
            and artefact_string_value = 'true' then 'Выявлены отклонения при валидации' else 'Валидация пройдена успешно' end as varchar(4000)
          )
        ) as val_results
      from
        artefact_realizations
      where
        artefact_id in (96, 151)
        and (
          nullif(:spicific_date_unloading, '') is not null
          and cast(
            coalesce(
              effective_from,
              to_timestamp(
                '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
              )
            ) as date
          ) < to_date(
            cast(
              coalesce(
                nullif(:spicific_date_unloading, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
        )
        or (
          nullif(:spicific_date_unloading, '') is null
          and effective_to = to_timestamp(
            '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
          )
        )
      group by
        model_id
    ) v_res_ on m_.model_id = v_res_.model_id
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
        and (
          nullif(:spicific_date_unloading, '') is not null
          and cast(
            coalesce(
              effective_from,
              to_timestamp(
                '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
              )
            ) as date
          ) < to_date(
            cast(
              coalesce(
                nullif(:spicific_date_unloading, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
        )
        or (
          nullif(:spicific_date_unloading, '') is null
          and effective_to = to_timestamp(
            '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
          )
        )
      group by ah.model_id
    ) mipmname_ on m_.model_id = mipmname_.model_id
    LEFT JOIN (
      SELECT
        U_M.MODEL_ID,
        MAX(U_M.EFFECTIVE_FROM) AS UPDATE_DATE
      FROM
        (
          SELECT
            MODEL_ID,
            EFFECTIVE_FROM
          FROM
            ARTEFACT_REALIZATIONS
          UNION ALL
          SELECT
            MODEL_ID,
            EFFECTIVE_FROM
          FROM
            BPMN_INSTANCES
          UNION ALL
          SELECT
            MODEL_ID,
            UPDATE_DATE AS EFFECTIVE_FROM
          FROM
            MODELS
        ) U_M
      WHERE
        U_M.MODEL_ID IN (
          SELECT
            DISTINCT MODEL_ID
          FROM
            MODELS
          WHERE
            MODELS_IS_ACTIVE_FLG = '1'
        )
      GROUP BY
        U_M.MODEL_ID
    ) M_UPD_DATE ON M_.MODEL_ID = M_UPD_DATE.MODEL_ID
  where
    m_.models_is_active_flg = '1'
    and (
      :includes_automl_models = '0'
      and m_.MODEL_DESC not like 'AutoML'
      or :includes_automl_models = '1'
    )
    and (
      (
        nullif(:spicific_date_unloading, '') is not null
        and cast(
          coalesce(
            i_date_.model_int_end_date,
            to_timestamp('1900-01-01', 'YYYY-MM-DD')
          ) as date
        ) < to_date(
          cast(
            coalesce(
              nullif(:spicific_date_unloading, ''),
              '5999-12-31'
            ) as varchar(4000)
          ),
          'YYYY-MM-DD'
        )
      )
      or (
        nullif(:spicific_date_unloading, '') is null
        and (
          cast(
            coalesce(
              i_date_.model_int_end_date,
              to_timestamp(
                '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
              )
            ) as date
          ) between to_date(
            cast(
              coalesce(
                nullif(:model_int_date_from, ''),
                '1900-01-01'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
          and to_date(
            cast(
              coalesce(
                nullif(:model_int_date_to, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          ) + 1
          and cast(
            coalesce(
              i_date_.model_int_end_date,
              to_timestamp(
                '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
              )
            ) as date
          ) between to_date(
            cast(
              coalesce(
                nullif(:model_int_date_from, ''),
                '1900-01-01'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
          and to_date(
            cast(
              coalesce(
                nullif(:model_int_date_to, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          ) + 1
        )
      )
    )
    and (
      nullif(:cust_tmpl, '') is null
      or (
        upper(mipmname_.BC_NAME) IN (
          select unnest(string_to_array(:cust_tmpl, ',')) as filter_id
        )
      )
    )
    and (
      (
        nullif(:spicific_date_unloading, '') is not null
        and (
          cast(
            coalesce(
              r_date_.model_removal_end_date,
              to_timestamp('1900-01-01', 'YYYY-MM-DD')
            ) as date
          ) < to_date(
            cast(
              coalesce(
                nullif(:spicific_date_unloading, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
          and cast(
            coalesce(
              M_UPD_DATE.UPDATE_DATE,
              to_timestamp('1900-01-01', 'YYYY-MM-DD')
            ) as date
          ) < to_date(
            cast(
              coalesce(
                nullif(:spicific_date_unloading, ''),
                '5999-12-31'
              ) as varchar(4000)
            ),
            'YYYY-MM-DD'
          )
        )
      )
      or (
        nullif(:spicific_date_unloading, '') is null
        and (
          (
            :only_prod_models = '1'
            and nullif(clsf_.integration_decree_date, '') IS NOT NULL
            and CURRENT_DATE > to_date(
              clsf_.integration_decree_date, 'DD-MM-YYYY HH24:MI'
            )
          )
          or (
            :only_prod_models = '0'
            and cast(
              coalesce(
                r_date_.model_removal_end_date,
                to_timestamp(
                  '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                )
              ) as date
            ) between to_date(
              cast(
                coalesce(
                  nullif(:model_removal_date_from, ''),
                  '1900-01-01'
                ) as varchar(4000)
              ),
              'YYYY-MM-DD'
            )
            and to_date(
              cast(
                coalesce(
                  nullif(:model_removal_date_to, ''),
                  '5999-12-31'
                ) as varchar(4000)
              ),
              'YYYY-MM-DD'
            ) + 1
            and cast(
              coalesce(
                M_UPD_DATE.UPDATE_DATE,
                to_timestamp(
                  '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                )
              ) as date
            ) between to_date(
              cast(
                coalesce(
                  nullif(:model_update_date_from, ''),
                  '1900-01-01'
                ) as varchar(4000)
              ),
              'YYYY-MM-DD'
            )
            and to_date(
              cast(
                coalesce(
                  nullif(:model_update_date_to, ''),
                  '5999-12-31'
                ) as varchar(4000)
              ),
              'YYYY-MM-DD'
            ) + 1
          )
        )
      )
    )
    and (
      upper(m_.model_name) like '%' || upper(:model_tmpl) || '%'
      or :model_tmpl is null
      or :model_tmpl = ''
    ) -- and (
    --              upper(coalesce(CLSF_.CUSTOMER_DEPT, 'Нет данных')) || ' / ' ||
    --              upper(coalesce(mipmname_.BC_NAME, 'Нет данных')) like '%' || upper(:cust_tmpl) || '%'
    --      or :cust_tmpl is null or :cust_tmpl = ''
    --  )
    -- and (
    --          upper(coalesce(CLSF_.MODEL_PRIORITY, 'Нет данных')) like '%' || upper(:model_priority_template) || '%'
    --      or :model_priority_template is null or :model_priority_template = ''
    --  )
    and (
      nullif(:model_priority_template, '') is null
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
              and (
                nullif(:spicific_date_unloading, '') is not null
                and cast(
                  coalesce(
                    ar.effective_from,
                    to_timestamp(
                      '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                    )
                  ) as date
                ) < to_date(
                  cast(
                    coalesce(
                      nullif(:spicific_date_unloading, ''),
                      '5999-12-31'
                    ) as varchar(4000)
                  ),
                  'YYYY-MM-DD'
                )
              )
              or (
                nullif(:spicific_date_unloading, '') is null
                and ar.effective_to = to_timestamp(
                  '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
                )
              )
          ) fct
          inner join (
            select unnest(string_to_array(:model_priority_template, ','))::numeric as filter_id
          ) flt on fct.artefact_value_id = flt.filter_id
      )
    )
    and (
      -- substr(clsf_.model_type_id, 1, length(:model_type_id_filter)) in (:model_type_id_filter) /* здесь нужно будет думать, как организовать поиск по подстроке */
      nullif(:model_type_id_filter, '') is null
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
              and (
                nullif(:spicific_date_unloading, '') is not null
                and cast(
                  coalesce(
                    ar.effective_from,
                    to_timestamp(
                      '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                    )
                  ) as date
                ) < to_date(
                  cast(
                    coalesce(
                      nullif(:spicific_date_unloading, ''),
                      '5999-12-31'
                    ) as varchar(4000)
                  ),
                  'YYYY-MM-DD'
                )
              )
              or (
                nullif(:spicific_date_unloading, '') is null
                and ar.effective_to = to_timestamp(
                  '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
                )
              )
          ) fct
          inner join (
            select unnest(string_to_array(:model_type_id_filter, ','))::numeric as filter_id
          ) flt on fct.artefact_value_id = flt.filter_id
      )
    )
    and (
      nullif(:company_group_id_filter, '') is null
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
              and (
                nullif(:spicific_date_unloading, '') is not null
                and cast(
                  coalesce(
                    ar.effective_from,
                    to_timestamp(
                      '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                    )
                  ) as date
                ) < to_date(
                  cast(
                    coalesce(
                      nullif(:spicific_date_unloading, ''),
                      '5999-12-31'
                    ) as varchar(4000)
                  ),
                  'YYYY-MM-DD'
                )
              )
              or (
                nullif(:spicific_date_unloading, '') is null
                and ar.effective_to = to_timestamp(
                  '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
                )
              )
          ) fct
          inner join (
            select unnest(string_to_array(:company_group_id_filter, ','))::numeric as filter_id
          ) flt on fct.artefact_value_id = flt.filter_id
      )
    )
    and (
      nullif(:product_and_scope_id_filter, '') is null
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
              and (
                nullif(:spicific_date_unloading, '') is not null
                and cast(
                  coalesce(
                    ar.effective_from,
                    to_timestamp(
                      '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                    )
                  ) as date
                ) < to_date(
                  cast(
                    coalesce(
                      nullif(:spicific_date_unloading, ''),
                      '5999-12-31'
                    ) as varchar(4000)
                  ),
                  'YYYY-MM-DD'
                )
              )
              or (
                nullif(:spicific_date_unloading, '') is null
                and ar.effective_to = to_timestamp(
                  '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
                )
              )
          ) fct
          inner join (
            select unnest(string_to_array(:product_and_scope_id_filter, ','))::numeric as filter_id
          ) flt on fct.artefact_value_id = flt.filter_id
      )
    )
    and (
      nullif(:model_developing_reasons, '') is null
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
              and (
                nullif(:spicific_date_unloading, '') is not null
                and cast(
                  coalesce(
                    ar.effective_from,
                    to_timestamp(
                      '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                    )
                  ) as date
                ) < to_date(
                  cast(
                    coalesce(
                      nullif(:spicific_date_unloading, ''),
                      '5999-12-31'
                    ) as varchar(4000)
                  ),
                  'YYYY-MM-DD'
                )
              )
              or (
                nullif(:spicific_date_unloading, '') is null
                and ar.effective_to = to_timestamp(
                  '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
                )
              )
          ) fct
          inner join (
            select unnest(string_to_array(:model_developing_reasons, ','))::numeric as filter_id
          ) flt on fct.artefact_value_id = flt.filter_id
      )
    )
    and (
      nullif(:model_ds_departments, '') is null
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
              and (
                nullif(:spicific_date_unloading, '') is not null
                and cast(
                  coalesce(
                    ar.effective_from,
                    to_timestamp(
                      '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
                    )
                  ) as date
                ) < to_date(
                  cast(
                    coalesce(
                      nullif(:spicific_date_unloading, ''),
                      '5999-12-31'
                    ) as varchar(4000)
                  ),
                  'YYYY-MM-DD'
                )
              )
              or (
                nullif(:spicific_date_unloading, '') is null
                and ar.effective_to = to_timestamp(
                  '9999-12-3123:59:59', 'yyyy-mm-ddhh24:mi:ss'
                )
              )
          ) fct
          inner join (
            select unnest(string_to_array(:model_ds_departments, ','))::numeric as filter_id
          ) flt on fct.artefact_value_id = flt.filter_id
      )
    )
`;

module.exports = sql;
