BEGIN;

DELETE FROM artefact_x_bpmn
WHERE artefact_id IN (
    77,   -- rating_system_name — Название рейтинговой системы
    784,  -- model_indicator — Индикатор модели
    786,  -- implementation_validity — Утверждение Модели / РС / Алгоритма в эксплуатацию
    787,  -- validity_approve — Решение об утверждении Модели / РС
    794,  -- importance_changes — Существенность внесенных изменений в РС
    795,  -- approve_importance — Утверждение уровня существенности
    796   -- approve_importance_changes — Решение об утверждении уровня существенности
  )
  AND bpmn_name = 'initialization';

UPDATE artefacts
SET is_edit_flg = '0'
WHERE artefact_id IN (77, 784, 786, 787, 794, 795, 796);

COMMIT;