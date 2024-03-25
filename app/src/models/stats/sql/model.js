module.exports = `
    select
        b.bpmn_key_desc as "LABEL",
        sum(case when t.bpmn_key_id is not null and t.row_num = 1 then 1 else 0 end) as "VALUE"
    from bpmn_processes b
    left join 
    (
        select
            model_id,
            bpmn_key_id,
            row_number() over (partition by model_id order by create_dttm desc) as row_num
        from bpmn_instances
        where effective_to =  TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
    ) t 
        on t.bpmn_key_id = b.bpmn_key_id
    inner join models m 
        on t.model_id = m.model_id 
            and m.MODELS_IS_ACTIVE_FLG = '1'
    group by b.bpmn_key_desc
    ORDER BY
        min(b.bpmn_key_id)
`
