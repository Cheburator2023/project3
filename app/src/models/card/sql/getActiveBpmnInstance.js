/*
    Return last active BPMN instance of the model
*/

const sql = `
  select
    t2.model_id,
    t2.bpmn_instance_name,
    t2.effective_from
  from
    (
      select
        t1.model_id,
        t1.bpmn_instance_name,
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
            bbii.bpmn_key_desc as bpmn_instance_name,
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
                    bbbiii.effective_from desc,
                    bbbiii.bpmn_key_id desc
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
`;

module.exports = sql;
