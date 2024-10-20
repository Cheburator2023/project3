/*
  Поиск модели по general_model_id. Возвращает последнюю версию.
*/

const sql = `
  SELECT
      m.*
  FROM
      models as m
  WHERE
      m.general_model_id = :general_model_id
  ORDER BY m.model_version DESC
  LIMIT 1
`;

module.exports = sql;
