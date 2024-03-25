/*
:SYS_SCALE_RANK_ID - ID удаляемой строки
*/


const sql = `
DELETE FROM RISK_SCALE_RANKS
WHERE SYS_SCALE_RANK_ID = :SYS_SCALE_RANK_ID
`

module.exports = sql
