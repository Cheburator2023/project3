const sql = `
select 
  ar_.SCALE_CODE, 
  r_.RISK_SCALE_NAME, 
  ar_.SCALE_CATEGORY, 
  ar_.SCALE_ID, 
  ar_.CORRESP_SCALE, 
  rr_.SCALE_RANK_CAT, 
  ar_.SCALE_TYPE,
  ar_.RISK_SCALE_START_DATE, 
  ar_.RISK_SCALE_END_DATE, 
  ar_.SCALE_PARAMETER, 
  rr_.SCALE_RANK_MIN, 
  rr_.SCALE_RANK_MAX, 
  ar_.PARAMETER_VALUE, 
  r_.VERSION,
  TO_CHAR(CURRENT_DATE, 'yyyy-MM-dd') AS "current_date"
  -- ar_.RISK_SCALE_DATE, -- для проверки
  -- rr_.effective_from as RISK_SCALE_RANK_DATE -- для проверки
from 
  risk_scales r_ 
  left join (
    select 
      ar_.root_risk_scale_id, 
      ar_.effective_from, 
      ar_.effective_to, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 296 THEN AV_.ARTEFACT_VALUE ELSE NULL END
      ) AS SCALE_CATEGORY, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 297 THEN AV_.ARTEFACT_VALUE ELSE NULL END
      ) AS SCALE_ID, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 298 THEN AV_.ARTEFACT_VALUE ELSE NULL END
      ) AS SCALE_TYPE, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 301 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS RISK_SCALE_END_DATE,
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 302 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS SCALE_CODE, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 305 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS CORRESP_SCALE, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 304 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS SCALE_PARAMETER, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 306 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS PARAMETER_VALUE, 
      MAX(
        CASE WHEN AR_.ARTEFACT_ID = 308 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END
      ) AS RISK_SCALE_START_DATE 
    from 
      risk_scale_artefact_realizations ar_ 
      left join artefact_values av_ on ar_.artefact_value_id = av_.artefact_value_id 
      and av_.is_active_flg = '1' --where ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
    group by 
      ar_.root_risk_scale_id, 
      ar_.effective_from, 
      ar_.effective_to
  ) ar_ on r_.root_risk_scale_id = ar_.root_risk_scale_id 
  left join risk_scale_ranks rr_ on r_.root_risk_scale_id = rr_.root_risk_scale_id --and rr_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
where 
  cast(
    coalesce(
      to_timestamp(
        replace(
          replace(ar_.RISK_SCALE_START_DATE, 'T', ' '), 
          '.000Z', 
          ''
        ), 
        'yyyy-mm-dd hh24:mi:ss'
      ), 
      to_timestamp(
        '1900-01-0100:00:00', 'yyyy-mm-ddhh24:mi:ss'
      )
    ) as date
  ) between to_date(
    cast(
      coalesce(
        :scale_start_date_from, '1900-01-01'
      ) as varchar(4000)
    ), 
    'YYYY-MM-DD'
  ) 
  and to_date(
    cast(
      coalesce(
        :scale_end_date_to, '5999-12-31'
      ) as varchar(4000)
    ), 
    'YYYY-MM-DD'
  ) 
  and (
    (
      :slice::text is null
      and ar_.effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      ) 
      and rr_.effective_to = TO_TIMESTAMP(
        '9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS'
      )
    ) 
    or (
      :slice::text is not null
      and to_date(
        cast(
          :slice as varchar(4000)
        ), 
        'YYYY-MM-DD'
      ) between date_trunc('day', rr_.effective_from)::date
      and date_trunc('day', rr_.effective_to)::date
      and to_date(
        cast(
          :slice as varchar(4000)
        ), 
        'YYYY-MM-DD'
      ) between date_trunc('day', ar_.effective_from)::date
      and date_trunc('day', ar_.effective_to)::date
    )
  )
`

module.exports = sql
