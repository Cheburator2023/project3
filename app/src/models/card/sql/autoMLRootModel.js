/*
  Поиск существующих моделей autoML
*/

const sql = `
  SELECT
      model_id
  FROM
      models
  WHERE
      model_version = 1
      AND model_name LIKE :MODEL_NAME
      AND model_desc = :MODEL_DESC
`;

module.exports = sql;