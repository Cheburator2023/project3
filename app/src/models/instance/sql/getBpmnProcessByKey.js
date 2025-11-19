module.exports = `
    SELECT
        *
    FROM bpmn_processes 
    WHERE 
        bpmn_key_desc = :key
`