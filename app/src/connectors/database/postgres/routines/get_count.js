const sql = `
create or replace function get_count(source_char varchar, pattern varchar)
    returns int
    language plpgsql
as
$$
declare
    count int;
begin
    select round((length(source_char) - length(replace(source_char, pattern, '')) / length(pattern)))
    into count;

    return count;
end;
$$;
`

module.exports = sql
