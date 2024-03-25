/*
    Должен возвращать статус карточки
*/

const sql = `
SELECT model_id,
        STRING_AGG(status, ';') as status
        FROM (
        SELECT model_id,
            CASE
                WHEN artefact_id = 52
                    AND artefact_string_value = 'Нет, доработки не актуальны'
                    THEN 'Модель не эффективна в бизнес-процессе'
                WHEN artefact_id = 174
                    AND (artefact_string_value is null OR artefact_string_value = 'false')
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 201
                    AND (artefact_value_id IN (313, 314, 315))
                    THEN artefact_string_value
                WHEN artefact_id = 367
                    AND (artefact_value_id IN (519))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 373
                    AND (artefact_value_id IN (411))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 323
                    AND (artefact_value_id IN (426))
                    THEN 'Архив'
                WHEN artefact_id = 351
                    AND (artefact_value_id IN (399))
                    THEN 'Архив'
                WHEN artefact_id = 152
                    AND (artefact_value_id IN (35))
                    THEN 'Архив'
                WHEN artefact_id = 323
                    AND (artefact_value_id IN (427))
                    THEN 'Разработана, не внедрена'
                WHEN (artefact_id = 780 OR artefact_id = 779)
                    AND artefact_string_value = 'true'
                    THEN 'Вывод модели из эксплуатации'
                END AS status
        FROM artefact_realizations
        WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
    ) AS FOO
    GROUP BY model_id
`;

module.exports = sql;
