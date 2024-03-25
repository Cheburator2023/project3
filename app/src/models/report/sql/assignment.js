const sql = `
SELECT
    DISTINCT  TO_CHAR(ra.CREATE_DATE,
    'YYYY-MM-DD HH24:MI') AS CREATE_DATE,
    ra.STATUS,
    ar.ASSIGNMENT_MODEL_RISK,
    ar.ASSIGNMENT_RISK_TYPE,
    ar.ASSIGNMENT_NUMBER,
    ar.ASSIGNMENT_CONTRACTOR,
    ar.ASSIGNMENT_PROTOCOL_DETAILS,
    ar.ASSIGNMENT_UO_NAME,
    ar.ASSIGNMENT_UO_QUESTION,
    ar.ASSIGNMENT_DEPARTMENT,
    ar.ASSIGNMENT_TEXT,
    ar.ASSIGNMENT_MODEL,
    ar.ASSIGNMENT_MODEL,
    ar.ASSIGNMENT_END_DATE_TEXT,
    ar.ASSIGNMENT_END_DATE  
from
    ROOT_ASSIGNMENT ra 
inner join
    ASSIGNMENT a 
        ON      ra.ID = a.ROOT_ASSIGNMENT_ID  
        AND      a.EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59',
    'YYYY-MM-DDHH24:MI:SS') 
INNER JOIN
    ASSIGNMENT_X_MODEL axm  
        ON  RA.ID = AXM.ROOT_ASSIGNMENT_ID  
        AND  axm.EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59',
    'YYYY-MM-DDHH24:MI:SS') 
    AND  (axm.MODEL_ID IN  (SELECT
        unnest(string_to_array(:model,
        ',')) as model) 
    OR :model IS NULL) 
left join
    (
        select
            ar.assignment_id,
            STRING_AGG(CASE 
                WHEN AR.ARTEFACT_ID = 685 THEN AV_.ARTEFACT_VALUE 
                ELSE NULL 
            END,
            ', ' 
        ORDER BY
            AR.artefact_value_id) AS ASSIGNMENT_MODEL_RISK,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 686 THEN AV_.ARTEFACT_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_RISK_TYPE,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 675 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_NUMBER,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 687 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_CONTRACTOR,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 676 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_PROTOCOL_DETAILS,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 677 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_UO_NAME,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 678 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_UO_QUESTION,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 679 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_DEPARTMENT,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 674 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_TEXT,
            STRING_AGG(CASE 
                WHEN AR.ARTEFACT_ID = 684 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END,
            ', ' 
        ORDER BY
            AR.artefact_value_id) AS ASSIGNMENT_MODEL,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 681 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_END_DATE_TEXT,
            MAX(CASE 
                WHEN AR.ARTEFACT_ID = 688 THEN AR.ARTEFACT_STRING_VALUE 
                ELSE NULL 
            END) AS ASSIGNMENT_END_DATE  
        from
            ASSIGNMENT_ARTEFACT_REALIZATIONS ar 
        left join
            artefact_values av_  
                on ar.artefact_value_id = av_.artefact_value_id 
                and av_.is_active_flg = '1' 
        where
            ar.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS') 
        group by
            ar.assignment_id 
    ) ar 
        on a.ID = ar.assignment_id 
WHERE
    (
        ra.CREATE_DATE BETWEEN  TO_DATE(CAST(COALESCE(:assignment_date_fltr_from, '1900-01-01') as varchar(4000)), 'YYYY-MM-DD') AND  TO_DATE(CAST(COALESCE(:assignment_date_fltr_to, '5999-01-01') as varchar(4000)), 'YYYY-MM-DD')
    ) 
    AND  (
        ra.END_DATE IS NULL 
        OR ra.END_DATE BETWEEN  TO_DATE(CAST(COALESCE(:initial_end_date_fltr_from, '1900-01-01') as varchar(4000)), 'YYYY-MM-DD') AND  TO_DATE(CAST(COALESCE(:initial_end_date_fltr_to, '5999-01-01') as varchar(4000)), 'YYYY-MM-DD')
    ) 
    AND  (
        ar.ASSIGNMENT_END_DATE IS NULL 
        OR TO_DATE(COALESCE(ar.ASSIGNMENT_END_DATE, '2000-01-01'), 'YYYY-MM-DD') BETWEEN  TO_DATE(CAST(COALESCE(:actual_end_date_fltr_from, '1900-01-01') as varchar(4000)), 'YYYY-MM-DD') AND  TO_DATE(CAST(COALESCE(:actual_end_date_fltr_to, '5999-01-01') as varchar(4000)), 'YYYY-MM-DD')
    ) 
    AND  (
        ar.ASSIGNMENT_PROTOCOL_DETAILS IN  (
            SELECT
                unnest(string_to_array(:assignment_protocol_details,
                ',')) as assignment_protocol_details
        ) 
        OR :assignment_protocol_details IS NULL
    )  
    AND  (
        ar.ASSIGNMENT_UO_NAME IN  (
            SELECT
                unnest(string_to_array(:assignment_uo_name,
                ',')) as assignment_uo_name
        ) 
        OR :assignment_uo_name IS NULL
    )  
    AND  (
        ar.ASSIGNMENT_UO_QUESTION IN  (
            SELECT
                unnest(string_to_array(:assignment_uo_question,
                ',')) as assignment_uo_question
        ) 
        OR :assignment_uo_question IS NULL
    )  
    AND  (
        ar.ASSIGNMENT_DEPARTMENT IN  (
            SELECT
                unnest(string_to_array(:assignment_department,
                ',')) as assignment_department
        ) 
        OR :assignment_department IS NULL
    )  
    AND  (
        ar.ASSIGNMENT_CONTRACTOR IN  (
            SELECT
                unnest(string_to_array(:assignment_contractor,
                ',')) as assignment_contractor
        ) 
        OR :assignment_contractor IS NULL
    )  
    AND  (
        ra.STATUS IN  (
            SELECT
                unnest(string_to_array(:status,
                ',')) as status
        ) 
        OR :status IS NULL 
    ) 
    AND  (
        ar.ASSIGNMENT_MODEL_RISK IN  (
            SELECT
                unnest(string_to_array(:assignment_model_risk,
                ',')) as assignment_model_risk
        ) 
        OR :assignment_model_risk IS NULL 
    ) 
    AND  (
        ar.ASSIGNMENT_RISK_TYPE IN  (
            SELECT
                unnest(string_to_array(:assignment_risk_type,
                ',')) as assignment_risk_type
        ) 
        OR :assignment_risk_type IS NULL
    )
`

module.exports = sql
