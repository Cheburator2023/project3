/*
    Должен возвращать статус карточки
*/

const sql = `
SELECT model_id,
        STRING_AGG(status, ';') as status
        FROM (
        SELECT model_id,
            CASE
                WHEN (artefact_id = 896)
                    AND (artefact_value_id IN (685))
                    THEN 'Модель не эффективна в бизнес-процессе'
                WHEN (artefact_id = 827)
                    AND (artefact_value_id IN (642))
                    THEN 'Модель не эффективна в бизнес-процессе'
                WHEN artefact_id = 52
                    AND artefact_string_value = 'Нет, доработки не актуальны'
                    THEN 'Модель не эффективна в бизнес-процессе'

                WHEN artefact_id = 174
                    AND (artefact_string_value is null OR artefact_string_value = 'false')
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 201
                    AND (artefact_value_id IN (313, 314, 315))
                    THEN artefact_string_value
                WHEN artefact_id = 896
                    AND (artefact_value_id IN (683))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 827
                    AND (artefact_value_id IN (642, 643))
                    THEN 'Разработана, не внедрена'
                WHEN artefact_id = 822
                    AND (artefact_value_id IN (637))
                    THEN 'Разработана, не внедрена'
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
                WHEN artefact_id = 822
                    AND (artefact_value_id IN (638))
                    THEN 'Архив'
                WHEN artefact_id = 818
                    AND (artefact_value_id IN (632))
                    THEN 'Архив'
                WHEN (artefact_id = 789)
                    AND (artefact_string_value IS NOT NULL)
                    THEN 'Архив'

                WHEN artefact_id = 323
                    AND (artefact_value_id IN (427))
                    THEN 'Разработана, не внедрена'

                WHEN (artefact_id = 780 OR artefact_id = 779)
                    AND artefact_string_value = 'true'
                    THEN 'Вывод модели из эксплуатации'

                WHEN (artefact_id = 853)
                    AND (artefact_value_id IN (657, 658))
                    THEN 'Разработана, внедрена в ПИМ'
                WHEN (artefact_id = 872)
                    AND (artefact_value_id IN (667))
                    THEN 'Разработана, внедрена в ПИМ'
                WHEN (artefact_id = 890)
                    AND (artefact_value_id IN (670))
                    THEN 'Разработана, внедрена в ПИМ'

                WHEN (artefact_id = 827)
                    AND (artefact_value_id IN (641))
                    THEN 'Разработана, внедрена вне ПИМ'
                WHEN (artefact_id = 853)
                    AND (artefact_value_id IN (659))
                    THEN 'Разработана, внедрена вне ПИМ'
                WHEN (artefact_id = 896)
                    AND (artefact_value_id IN (684))
                    THEN 'Разработана, внедрена вне ПИМ'

                WHEN (artefact_id = 825)
                    AND (artefact_string_value = 'true')
                    THEN 'Опытная эксплуатация на контуре разработки'
                END AS status
        FROM artefact_realizations
        WHERE effective_to = TO_TIMESTAMP('9999-12-3123:59:59', 'YYYY-MM-DDHH24:MI:SS')
    ) AS FOO
    GROUP BY model_id
`;

module.exports = sql;
