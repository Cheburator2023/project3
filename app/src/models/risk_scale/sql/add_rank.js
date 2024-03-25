/*
:ROOT RISK_SCALE_ID - ID заполняемой шкалы
остальные параметры - из формы
*/


const sql = `
    INSERT INTO RISK_SCALE_RANKS
        (
			SYS_SCALE_RANK_ID,
			ROOT_RISK_SCALE_ID,
			SCALE_RANK_ID,
			SCALE_RANK_CAT,
			SCALE_RANK_MIN,
			SCALE_RANK_AVG,
			SCALE_RANK_MAX
		)
    VALUES
        (	
			nextval('SYS_SCALE_RANKS_SEQ'),
      :ROOT_RISK_SCALE_ID,
      nullif(:SCALE_RANK_ID, '')::varchar,
      nullif(:SCALE_RANK_CAT, '')::varchar,
      nullif(:SCALE_RANK_MIN, '')::numeric,
      nullif(:SCALE_RANK_AVG, '')::numeric,
      nullif(:SCALE_RANK_MAX, '')::numeric
        )
`

module.exports = sql
