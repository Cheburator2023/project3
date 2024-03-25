/*
    Артефакты карточки.
*/

const sql = `
    SELECT
        AR_.ARTEFACT_ID,
        AR_.MODEL_ID,
        AR_.ARTEFACT_VALUE_ID,
        AR_.ARTEFACT_STRING_VALUE,
        AR_.ARTEFACT_ORIGINAL_VALUE,
        AR_.CREATOR,
        AR_.EFFECTIVE_FROM,
        AR_.EFFECTIVE_TO,
        A_.ARTEFACT_TECH_LABEL,
        A_.ARTEFACT_LABEL,
        A_.ARTEFACT_DESC,
        A_.ARTEFACT_CONTEXT,
        A_.IS_MAIN_INFO_FLG,
        A_.IS_CLASS_FLG,
        A_.IS_EDIT_FLG,
        A_.ARTEFACT_TYPE_ID,
        A_.ARTEFACT_BUSINESS_GROUP_ID,
        BG_.BUSINESS_GROUP_LABEL,
        AV_.ARTEFACT_VALUE,
        AV_.IS_ACTIVE_FLG,
        AV_.ARTEFACT_PARENT_VALUE_ID,
        AT_.ARTEFACT_TYPE_DESC,
        AB_.BPMN_NAME
    FROM
        ARTEFACT_REALIZATIONS AR_
    INNER JOIN
        ARTEFACTS A_
    ON
        AR_.ARTEFACT_ID = A_.ARTEFACT_ID
    LEFT JOIN 
        BUSINESS_GROUPS BG_
    ON
        A_.ARTEFACT_BUSINESS_GROUP_ID = BG_.BUSINESS_GROUP_ID
    LEFT JOIN
            ARTEFACT_VALUES AV_
        ON
            AR_.ARTEFACT_VALUE_ID = AV_.ARTEFACT_VALUE_ID
    INNER JOIN
            ARTEFACT_X_TYPE AT_
        ON
            A_.ARTEFACT_TYPE_ID = AT_.ARTEFACT_TYPE_ID
    INNER JOIN
            ARTEFACT_X_BPMN AB_
        ON 
            AR_.ARTEFACT_ID = AB_.ARTEFACT_ID
    WHERE
            AR_.MODEL_ID = :MODEL_ID
    /*
        AND
            (A_.IS_CLASS_FLG = '1' or (A_.is_class_flg = CASE WHEN :is_class_flg = '0' THEN '0' ELSE '-1' END))
    */
    and
    (
        ( :is_class_flg = '1' and A_.is_class_flg = '1')
    
            or 
        (

            (
                AB_.BPMN_NAME in (
                    SELECT 
                        regexp_substr( :TYPE ,'[^,]+', 1, level) 
                    FROM  
                        DUAL
                    CONNECT BY regexp_substr( :TYPE , '[^,]+', 1, level) is not null
                    )
            )
        )
    )
    AND
        AR_.EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
    ORDER BY
        AR_.ARTEFACT_ID,
        AV_.ARTEFACT_VALUE_ID
`

module.exports = sql