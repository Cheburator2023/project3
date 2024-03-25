const sql = `
SELECT
    t1.*,
    ST.status,
    MT.DEPARTMENT_VALUE,
    MT.MIPM_VALUE
FROM
    MODELS t1
INNER JOIN
    ASSIGNMENT_X_MODEL RM
        ON RM.MODEL_ID = t1.MODEL_ID
        AND RM.ROOT_ASSIGNMENT_ID = :ID
        AND RM.EFFECTIVE_TO =  TO_TIMESTAMP('9999-12-3123:59:59',
    'YYYY-MM-DDHH24:MI:SS')
INNER JOIN
    (
        select
            distinct model_id,
            bpmn_key_id
        from
            BPMN_INSTANCES
    ) t2
        ON         t1.MODEL_ID = t2.MODEL_ID
INNER JOIN
    BPMN_PROCESSES t3
        ON         t3.BPMN_KEY_ID = t2.BPMN_KEY_ID
INNER JOIN
    (
        select
            t2.model_id,
            t2.status_ as STATUS,
            t2.effective_from
        from
            (     select
                t1.model_id,
                t1.status_,
                t1.effective_from,
                row_number() over(partition
            by
                t1.model_id
            order by
                t1.effective_from desc) as rnrn_
            from
                (         select
                    bbii.model_id,
                    bbii.bpmn_key_desc as status_,
                    bbii.effective_from
                from
                    (             select
                        bbbiii.model_id,
                        bbbppp.bpmn_key_desc,
                        bbbiii.bpmn_key_id,
                        bbbiii.effective_from,
                        row_number() over (partition
                    by
                        bbbiii.model_id
                    order by
                        bbbiii.effective_from desc) as rn_
                    from
                        bpmn_instances bbbiii
                    inner join
                        bpmn_processes bbbppp
                            on bbbiii.bpmn_key_id = bbbppp.bpmn_key_id             ) bbii
                where
                    bbii.rn_ = 1
                union
                all      select
                    status_2_.model_id,
                    status_2_.status_,
                    status_2_.effective_from
                from
                    (             select
                        ar_.model_id,
                        case
                            when ar_.artefact_id = 52
                            and ar_.artefact_string_value = 'Нет, доработки не актуальны' then 'Модель не эффективна в бизнес-процессе'
                            when ar_.artefact_id = 174
                            and ( ar_.artefact_string_value is null
                            or ar_.artefact_string_value = 'false' ) then 'Модель разработана, не внедрена'
                            when ar_.artefact_id = 201
                            and ( ar_.artefact_value_id in (314,
                            315) ) then ar_.artefact_string_value
                            WHEN ar_.artefact_id = 367
                            AND (ar_.artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
                            WHEN ar_.artefact_id = 373
                            AND (ar_.artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
                            WHEN ar_.artefact_id = 323
                            AND (ar_.artefact_value_id IN (426)) THEN 'Архив'
                            WHEN ar_.artefact_id = 351
                            AND (ar_.artefact_value_id IN (399)) THEN 'Архив'
                            WHEN ar_.artefact_id = 152
                            AND (ar_.artefact_value_id IN (35)) THEN 'Архив'
                            WHEN ar_.artefact_id = 323
                            AND (ar_.artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
                            else NULL
                        end as status_,
                        ar_.effective_from,
                        row_number() over (partition
                    by
                        ar_.model_id
                    order by
                        ar_.effective_from desc) as r_num
                    from
                        artefact_realizations ar_
                    where
                        ar_.artefact_id in (
                            52, 201, 174, 367, 373, 323,351,152
                        )
                        and ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
                        and case
                            when ar_.artefact_id = 52
                            and ar_.artefact_string_value = 'Нет, доработки не актуальны' then 'Модель не эффективна в бизнес-процессе'
                            when ar_.artefact_id = 174
                            and (
                                ar_.artefact_string_value is null
                                or ar_.artefact_string_value = 'false'
                            ) then 'Модель разработана, не внедрена'
                            when ar_.artefact_id = 201
                            and (
                                ar_.artefact_value_id in (
                                    314, 315
                                )
                            ) then ar_.artefact_string_value
                            WHEN ar_.artefact_id = 367
                            AND (
                                ar_.artefact_value_id IN (
                                    519
                                )
                            ) THEN 'Разработана, не внедрена'
                            WHEN ar_.artefact_id = 373
                            AND (
                                ar_.artefact_value_id IN (
                                    411
                                )
                            ) THEN 'Разработана, не внедрена'
                            WHEN ar_.artefact_id = 323
                            AND (
                                ar_.artefact_value_id IN (
                                    426
                                )
                            ) THEN 'Архив'
                            WHEN ar_.artefact_id = 351
                            AND (
                                ar_.artefact_value_id IN (
                                    399
                                )
                            ) THEN 'Архив'
                            WHEN ar_.artefact_id = 152
                            AND (
                                ar_.artefact_value_id IN (
                                    35
                                )
                            ) THEN 'Архив'
                            WHEN ar_.artefact_id = 323
                            AND (
                                ar_.artefact_value_id IN (
                                    427
                                )
                            ) THEN 'Разработана, не внедрена'
                            else NULL
                        end is not NULL         ) status_2_
                where
                    status_2_.r_num = 1
                ) t1
        ) t2
    where
        t2.rnrn_ = 1
    ) ST
        ON             t1.MODEL_ID = ST.MODEL_ID
INNER JOIN
    (
        SELECT
            m.MODEL_ID,
            m.ROOT_MODEL_ID,
            m.MODEL_NAME,
            m.MODEL_DESC,
            m.MODEL_VERSION,
            CAST(m.CREATE_DATE AS DATE) as CREATE_DATE,
            CAST(m.UPDATE_DATE AS DATE) AS UPDATE_DATE,
            m.UPDATE_AUTHOR,
            m.PARENT_MODEL_ID,
            MAX(CASE
                WHEN ar.ARTEFACT_ID = 6 THEN av.ARTEFACT_VALUE
                ELSE NULL
            END) AS business_customer_departament,
            MAX(CASE
                WHEN ar.ARTEFACT_ID = 7 THEN av.ARTEFACT_VALUE
                ELSE NULL
            END) AS DEPARTMENT_VALUE,
            MAX(CASE
                WHEN ar.ARTEFACT_ID = 83 THEN ar.ARTEFACT_STRING_VALUE
                ELSE NULL
            END) AS MIPM_VALUE
        FROM
            MODELS m
        INNER JOIN
            ARTEFACT_REALIZATIONS ar
                ON m.MODEL_ID = ar.MODEL_ID
                AND ar.EFFECTIVE_TO =  TO_TIMESTAMP('9999-12-3123:59:59',
            'YYYY-MM-DDHH24:MI:SS')
            AND ar.ARTEFACT_ID IN (6,
            7,
            83)
        INNER JOIN
            ARTEFACTS a
                ON ar.ARTEFACT_ID = a.ARTEFACT_ID
        LEFT JOIN
            ARTEFACT_X_TYPE axt
                ON a.ARTEFACT_TYPE_ID = axt.ARTEFACT_TYPE_ID
        LEFT JOIN
            ARTEFACT_VALUES av
                ON ar.ARTEFACT_ID = av.ARTEFACT_ID
                AND ar.ARTEFACT_VALUE_ID = av.ARTEFACT_VALUE_ID
        WHERE
            (
                (
                    :is_ds_flg = '1'
                    and m.model_id in   (
                        select
                            distinct m_tmp.MODEL_ID
                        from
                            MODELS m_tmp
                        INNER JOIN
                            ARTEFACT_REALIZATIONS ar
                                ON m_tmp.MODEL_ID = ar.MODEL_ID
                                AND ar.ARTEFACT_ID = 7
                                AND ar.effective_to = TO_TIMESTAMP('9999-12-3123:59:59',
                            'YYYY-MM-DDHH24:MI:SS')
                        INNER JOIN
                            ARTEFACTS a
                                ON ar.ARTEFACT_ID = a.ARTEFACT_ID
                        INNER JOIN
                            ARTEFACT_VALUES av
                                ON av.ARTEFACT_ID = ar.ARTEFACT_ID
                                AND av.ARTEFACT_VALUE_ID = ar.ARTEFACT_VALUE_ID
                                AND av.ARTEFACT_VALUE in (
                                    select unnest(string_to_array(:groups, ','))::varchar
                                )
                            )
                    )
                )
                OR (
                    (
                        :is_bc_flg = '1'
                        and m.model_id in   (
                            select
                                distinct m_tmp.MODEL_ID
                        from
                            MODELS m_tmp
                        INNER JOIN
                            ARTEFACT_REALIZATIONS ar
                                ON m_tmp.MODEL_ID = ar.MODEL_ID
                                AND ar.ARTEFACT_ID = 6
                                AND ar.effective_to = TO_TIMESTAMP('9999-12-3123:59:59',
                            'YYYY-MM-DDHH24:MI:SS')
                        INNER JOIN
                            ARTEFACTS a
                                ON ar.ARTEFACT_ID = a.ARTEFACT_ID
                        INNER JOIN
                            ARTEFACT_VALUES av
                                ON av.ARTEFACT_ID = ar.ARTEFACT_ID
                                AND av.ARTEFACT_VALUE_ID = ar.ARTEFACT_VALUE_ID
                                AND av.ARTEFACT_VALUE in (
                                    select unnest(string_to_array(:groups, ','))::varchar
                                )
                            )
                    )
                )
                OR (
                    :is_bc_flg = '0'
                    and :is_ds_flg = '0'
                )
        GROUP BY
            m.MODEL_ID,
            m.ROOT_MODEL_ID,
            m.MODEL_NAME,
            m.MODEL_DESC,
            m.MODEL_VERSION,
            CAST(m.CREATE_DATE AS DATE),
            CAST(m.UPDATE_DATE AS DATE),
            m.UPDATE_AUTHOR,
            m.PARENT_MODEL_ID
        ORDER BY
            m.MODEL_ID) MT

        ON t1.MODEL_ID = MT.MODEL_ID
        WHERE
            t1.MODELS_IS_ACTIVE_FLG = :active
            AND t3.BPMN_KEY_DESC in (
                select unnest(string_to_array(:type, ','))::varchar
            )
        ORDER BY
            t1.CREATE_DATE
`

module.exports = sql
