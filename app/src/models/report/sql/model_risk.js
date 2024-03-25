const sql = `

with pre_adj_rep as (
select
    row_number() over(order by m_.root_model_id asc, m_.model_version asc) as R_NUM, -- Номер строки
	coalesce(CLSF_.COMPANY_GROUP, 'Нет данных') as COMPANY_GROUP, -- Компания группы
    m_.model_id,
    M_.MODEL_NAME, -- Название модели
    M_.ROOT_MODEL_ID, -- Идентификатор модели
    m_.models_is_active_flg, 
	m_.create_date,
	coalesce(status_.status, 'Нет данных') as status, -- Статус
	M_.MODEL_VERSION, -- Версия модели
    coalesce(case
        when regexp_count(clsf_.model_type, '>') = 0
            then clsf_.model_type
            else substr(clsf_.model_type, 1, instr(clsf_.model_type, '>', 1, 1) - 2)
        end, 'Нет данных') as MODEL_TYPE_LEV1, -- Тип модели (1-й уровень)
    coalesce(case
        when regexp_count(clsf_.model_type, '>') = 1
               then substr(clsf_.model_type, instr(clsf_.model_type, '>', 1, 1) + 2)
        when regexp_count(clsf_.model_type, '>') = 2
               then substr(clsf_.model_type, instr(clsf_.model_type, '>', 1, 1) + 2, instr(clsf_.model_type, '>', 1, 2) -  instr(clsf_.model_type, '>', 1, 1) - 3)
            else null
        end, 'Нет данных') as MODEL_TYPE_LEV2, -- Тип модели (2-й уровень)
	coalesce(clsf_.MODEL_SEGMENT_VALID, 'Нет данных') as MODEL_SEGMENT_VALID, -- Сегмент модели
  	coalesce(CLSF_.SIGN_ADJACENCY, 'Нет данных') as SIGN_ADJACENCY, -- Признак смежности моделей
	coalesce(CLSF_.VALIDATION_RESULT, 'Нет данных') as VALIDATION_RESULT, -- Результат валидации
	coalesce(CLSF_.mr_rate_segment, 'Нет данных') as mr_rate_segment, -- Результат по МР для сегмента (учет PD и LGD)
	coalesce(CLSF_.mr_sign_excessive_conservatism, 'Нет данных') as mr_sign_excessive_conservatism, -- Признак избыточной конервативности, покрывающей 100% риска
	coalesce(CLSF_.date_KUORR, 'Нет данных') as date_KUORR, -- Дата валидации/ ре-калибровки
	case 
		when coalesce(CLSF_.mr_sign_ek, 'Нет данных') = 'true' then 'Да'
		when coalesce(CLSF_.mr_sign_ek, 'Нет данных') = 'false' then 'Нет'
		else coalesce(CLSF_.mr_sign_ek, 'Нет данных') end as mr_sign_ek, -- Использование для расчета ЭК
	-- coalesce(CLSF_.mr_rate_a_obsolescence, 'Нет данных') as mr_rate_a_obsolescence, -- Коэф А. - устаревания
	coalesce(final_obsolescence_calc.mr_rate_a_obsolescence_calc, 'Нет данных') as mr_rate_a_obsolescence_calc, -- Коэф А. - расчетный - устаревания
	coalesce(CLSF_.mr_test_result_1, 'Нет данных') as mr_test_result_1, -- 1.Полнота описания допущений и ограничений_valid
	coalesce(CLSF_.mr_comment_test_result_1, 'Нет данных') as mr_comment_test_result_1, -- Комментарий к результату теста 1_valid
	coalesce(CLSF_.mr_test_result_2, 'Нет данных') as mr_test_result_2, -- 2.Однозначно ли разработчик определил сегмент разработки и насколько данные, используемые для построения, соответствуют этому сегменту_valid
	coalesce(CLSF_.mr_comment_test_result_2, 'Нет данных') as mr_comment_test_result_2, -- Комментарий к результату теста 2_valid
	coalesce(CLSF_.mr_test_result_3, 'Нет данных') as mr_test_result_3, -- 3.Наличие существенной информации, которая могла бы повлиять на работу модели, но не вошла в разработку_valid
	coalesce(CLSF_.mr_comment_test_result_3, 'Нет данных') as mr_comment_test_result_3, -- Комментарий к результату теста 3_valid
	coalesce(CLSF_.mr_test_result_4, 'Нет данных') as mr_test_result_4, -- 4.Наличие осознания о переобучаемости модели, применение/неприменение консервативных надбавок (иследовался ли разработчиком этот аспект, другие замечания по структуре и дизайну модели_valid
	coalesce(CLSF_.mr_comment_test_result_4, 'Нет данных') as mr_comment_test_result_4, -- Комментарий к результату теста 4_valid
	coalesce(CLSF_.mr_test_result_5, 'Нет данных') as mr_test_result_5, -- 5.Качество ранжирования/результаты прохождения бэк тестирования_valid
	coalesce(CLSF_.mr_comment_test_result_5, 'Нет данных') as mr_comment_test_result_5, -- Комментарий к результату теста 5_valid
	coalesce(CLSF_.mr_test_result_6, 'Нет данных') as mr_test_result_6, -- 6.Стабильность ранжирования/результатов бэктестирования_valid
	coalesce(CLSF_.mr_comment_test_result_6, 'Нет данных') as mr_comment_test_result_6, -- Комментарий к результату теста 6_valid
	coalesce(CLSF_.mr_test_result_7, 'Нет данных') as mr_test_result_7, -- 7.По сегменту применения: стабильность, репрезентативность, однородность_valid
	coalesce(CLSF_.mr_comment_test_result_7, 'Нет данных') as mr_comment_test_result_7, -- Комментарий к результату теста 7_valid
	coalesce(CLSF_.mr_test_result_8, 'Нет данных') as mr_test_result_8, -- 8.Калибровка, недооценка/переоценка риска и другие существенные замечания, количественного анализа/консервативность модели_valid
	coalesce(CLSF_.mr_comment_test_result_8, 'Нет данных') as mr_comment_test_result_8, -- Комментарий к результату теста 8_valid
	coalesce(CLSF_.mr_test_result_9, 'Нет данных') as mr_test_result_9, -- 9.Соответствие разработки и применения модели в части технической реализации расчета (в том числе приёмо-сдаточные испытания), потоков данных, сегмента применения_valid
	coalesce(CLSF_.mr_comment_test_result_9, 'Нет данных') as mr_comment_test_result_9, -- Комментарий к результату теста 9_valid
	coalesce(CLSF_.mr_test_result_10, 'Нет данных') as mr_test_result_10, -- 10.Контроль качества входных данных, используемых при применении модели в ИТ системе_valid
	coalesce(CLSF_.mr_comment_test_result_10, 'Нет данных') as mr_comment_test_result_10, -- Комментарий к результату теста 10_valid
	coalesce(CLSF_.mr_test_result_11, 'Нет данных') as mr_test_result_11, -- 11.Недостатки и изменения, выявленные в части процесса применения модели._valid
	coalesce(CLSF_.mr_comment_test_result_11, 'Нет данных') as mr_comment_test_result_11, -- Комментарий к результату теста 11_valid
	coalesce(CLSF_.mr_test_result_12, 'Нет данных') as mr_test_result_12, -- 12.Недостатки и изменения, выявленные в части процесса применения модели._valid
	coalesce(CLSF_.mr_comment_test_result_12, 'Нет данных') as mr_comment_test_result_12, -- Комментарий к результату теста 12_valid
	coalesce(CLSF_.mr_test_result_1_ds, 'Нет данных') as mr_test_result_1_ds, -- 1.Полнота описания допущений и ограничений_ds
	coalesce(CLSF_.mr_comment_test_result_1_ds, 'Нет данных') as mr_comment_test_result_1_ds, -- Комментарий к результату теста 1_ds
	coalesce(CLSF_.mr_test_result_2_ds, 'Нет данных') as mr_test_result_2_ds, -- 2.Однозначно ли разработчик определил сегмент разработки и насколько данные, используемые для построения, соответствуют этому сегменту_ds
	coalesce(CLSF_.mr_comment_test_result_2_ds, 'Нет данных') as mr_comment_test_result_2_ds, -- Комментарий к результату теста 2_ds
	coalesce(CLSF_.mr_test_result_3_ds, 'Нет данных') as mr_test_result_3_ds, -- 3.Наличие существенной информации, которая могла бы повлиять на работу модели, но не вошла в разработку_ds
	coalesce(CLSF_.mr_comment_test_result_3_ds, 'Нет данных') as mr_comment_test_result_3_ds, -- Комментарий к результату теста 3_ds
	coalesce(CLSF_.mr_test_result_4_ds, 'Нет данных') as mr_test_result_4_ds, -- 4.Наличие осознания о переобучаемости модели, применение/неприменение консервативных надбавок (иследовался ли разработчиком этот аспект, другие замечания по структуре и дизайну модели_ds
	coalesce(CLSF_.mr_comment_test_result_4_ds, 'Нет данных') as mr_comment_test_result_4_ds, -- Комментарий к результату теста 4_ds
	coalesce(CLSF_.mr_test_result_5_ds, 'Нет данных') as mr_test_result_5_ds, -- 5.Качество ранжирования/результаты прохождения бэк тестирования_ds
	coalesce(CLSF_.mr_comment_test_result_5_ds, 'Нет данных') as mr_comment_test_result_5_ds, -- Комментарий к результату теста 5_ds
	coalesce(CLSF_.mr_test_result_6_ds, 'Нет данных') as mr_test_result_6_ds, -- 6.Стабильность ранжирования/результатов бэктестирования_ds
	coalesce(CLSF_.mr_comment_test_result_6_ds, 'Нет данных') as mr_comment_test_result_6_ds, -- Комментарий к результату теста 6_ds
	coalesce(CLSF_.mr_test_result_7_ds, 'Нет данных') as mr_test_result_7_ds, -- 7.По сегменту применения: стабильность, репрезентативность, однородность_ds
	coalesce(CLSF_.mr_comment_test_result_7_ds, 'Нет данных') as mr_comment_test_result_7_ds, -- Комментарий к результату теста 7_ds
	coalesce(CLSF_.mr_test_result_8_ds, 'Нет данных') as mr_test_result_8_ds, -- 8.Калибровка, недооценка/переоценка риска и другие существенные замечания, количественного анализа/консервативность модели_ds
	coalesce(CLSF_.mr_comment_test_result_8_ds, 'Нет данных') as mr_comment_test_result_8_ds, -- Комментарий к результату теста 8_ds
	coalesce(CLSF_.mr_ratio_k_validation, 'Нет данных') as mr_ratio_k_validation, -- Коэф К модели Валидация
	coalesce(CLSF_.mr_ratio_k_develop, 'Нет данных') as mr_ratio_k_develop, -- Коэф К модели Разработка
	coalesce(CLSF_.mr_ratio_k_result, 'Нет данных') as mr_ratio_k_result, -- Коэф К модели Итог
	coalesce(CLSF_.mr_ratio_k_process_analysis, 'Нет данных') as mr_ratio_k_process_analysis, -- Коэф К анализа процессов
	coalesce(CLSF_.mr_rate_k, 'Нет данных') as mr_rate_k, -- К без признака смежности сигнала на уровне сигнала по модели
	coalesce(CLSF_.mr_ratio_k_proces_models, 'Нет данных') as mr_ratio_k_proces_models, -- Коэф К модели и процесса
	coalesce(CLSF_.mr_rate_adjacency, 'Нет данных') as mr_rate_adjacency, -- Коэф с учетом смежности на желтых на уровне коэффициентов
	-- coalesce(CLSF_.mr_ratio_k_final_obsolescence, 'Нет данных') as mr_ratio_k_final_obsolescence, -- Итоговое значение коэф к модели и процесса (с учетом устаревания)
	coalesce(
        case when final_obsolescence_calc.mr_ratio_k_final_obsolescence_calc < 1 then replace(ltrim(to_char(final_obsolescence_calc.mr_ratio_k_final_obsolescence_calc, '0.9999')), ',', '.')
        else to_char(final_obsolescence_calc.mr_ratio_k_final_obsolescence_calc) end,
        '1') as mr_ratio_k_final_obsolescence_calc -- Итоговое значение коэф к модели и процесса (с учетом устаревания) расчетное

from models m_
left join
	(
		select
			ar_.model_id,
			-- max(ar_.effective_to) as eff_to,
			LISTAGG(case when ar_.artefact_id = 173 then av_.artefact_value else null end, ' > ') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS model_type,
			-- LISTAGG(case when ar_.artefact_id = 173 then av_.artefact_value_id else null end, ',') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS model_type_id,
			LISTAGG(case when ar_.artefact_id = 57 then av_.artefact_value else null end, ' > ') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS product_and_scope,
			-- LISTAGG(case when ar_.artefact_id = 57 then av_.artefact_value_id else null end, ',') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS product_and_scope_id,
			LISTAGG(case when ar_.artefact_id = 73 then av_.artefact_value else null end, ' > ') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS COMPANY_GROUP,
			-- LISTAGG(case when ar_.artefact_id = 73 then av_.artefact_value_id else null end, ',') WITHIN GROUP (ORDER BY ar_.artefact_value_id) AS COMPANY_GROUP_ID,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 444 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS SIGN_ADJACENCY,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 363 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS MODEL_SEGMENT_VALID,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 507 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS VALIDATION_RESULT,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 550 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_rate_segment,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 445 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_sign_excessive_conservatism,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 486 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS date_KUORR,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 447 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_sign_ek,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 551 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_rate_a_obsolescence,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 510 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_1,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 511 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_1,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 514 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_2,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 515 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_2,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 518 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_3,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 519 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_3,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 522 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_4,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 523 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_4,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 526 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_5,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 527 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_5,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 530 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_6,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 531 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_6,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 534 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_7,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 535 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_7,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 538 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_8,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 539 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_8,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 542 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_9,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 543 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_9,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 544 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_10,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 545 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_10,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 546 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_11,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 547 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_11,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 548 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_12,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 549 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_12,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 512 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_1_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 513 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_1_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 516 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_2_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 517 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_2_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 520 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_3_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 521 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_3_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 524 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_4_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 525 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_4_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 528 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_5_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 529 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_5_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 532 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_6_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 533 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_6_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 536 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_7_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 537 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_7_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 540 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_test_result_8_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 541 THEN AR_.ARTEFACT_STRING_VALUE ELSE NULL END) AS mr_comment_test_result_8_ds,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 552 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_ratio_k_validation,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 553 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_ratio_k_develop,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 554 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_ratio_k_result,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 555 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_ratio_k_process_analysis,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 556 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_rate_k,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 557 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_ratio_k_proces_models,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 558 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_rate_adjacency,
			MAX(CASE WHEN AR_.ARTEFACT_ID = 559 THEN replace(AR_.ARTEFACT_STRING_VALUE, ',', '.') ELSE NULL END) AS mr_ratio_k_final_obsolescence

		from artefact_realizations ar_
		left join artefact_values av_
			on ar_.artefact_value_id = av_.artefact_value_id
				and av_.is_active_flg = '1'
		where -- срез
				:slice is null
					and ar_.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
				or :slice is not null
					and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') between ar_.effective_from and ar_.effective_to

		group by ar_.model_id
	) clsf_
	on m_.model_id = clsf_.model_id
left join
	(SELECT ar1.model_id,
    CASE
			WHEN ar4.artefact_string_value is null then 1
			WHEN obsolescence_calc.mr_rate_a_obsolescence_calc is null then to_number(replace(ar3.artefact_string_value, ',', '.'))
			WHEN to_number(replace(obsolescence_calc.mr_rate_a_obsolescence_calc, ',', '.')) * to_number(replace(ar3.artefact_string_value, ',', '.')) < 1
				then to_number(replace(obsolescence_calc.mr_rate_a_obsolescence_calc, ',', '.')) * to_number(replace(ar3.artefact_string_value, ',', '.'))
        	ELSE 1 END as mr_ratio_k_final_obsolescence_calc,
			obsolescence_calc.mr_rate_a_obsolescence_calc
    FROM artefact_realizations ar1
    left join
	(
		SELECT ar1.model_id,
		to_char(CASE
				WHEN ar2.artefact_string_value is null THEN null
				WHEN ar2.artefact_string_value = '0' OR floor(MONTHS_BETWEEN((to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD')), TO_TIMESTAMP(ar1.artefact_string_value, 'DD.MM.YYYY HH24:MI')) / 12) < 1 THEN 1
				ELSE 1.3 + 0.1 * (floor(MONTHS_BETWEEN((to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD')), TO_TIMESTAMP(ar1.artefact_string_value, 'DD.MM.YYYY HH24:MI')) / 12) - 1)
				END) as mr_rate_a_obsolescence_calc
		FROM artefact_realizations ar1
		LEFT JOIN artefact_realizations ar2
		ON ar1.model_id = ar2.model_id
		WHERE ar1.artefact_id = 486 -- Дата протокола КУОРР
		AND ar2.artefact_id = 507 -- Результат валидации
		and (
			(:slice is null
				and ar1.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
				and ar2.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS'))
			or (:slice is not null
				and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') between ar1.effective_from and ar1.effective_to
				and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') between ar2.effective_from and ar2.effective_to))
		) obsolescence_calc
	on ar1.model_id = obsolescence_calc.model_id
    LEFT JOIN artefact_realizations ar3
    ON ar1.model_id = ar3.model_id
    LEFT JOIN artefact_realizations ar4
    ON ar1.model_id = ar4.model_id
    WHERE ar1.artefact_id = 559 -- Итоговое значение Коэф К-модели и процесса (с учетом устаревания)
    AND ar3.artefact_id = 558 -- Коэф с учетом смежности желтых на уровне коэффициентов
    AND ar4.artefact_id = 486 -- дата протокола КУОРР
	and (
		(:slice is null
			and ar1.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
			and ar3.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
			and ar4.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS'))
		or (:slice is not null
			and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') between ar1.effective_from and ar1.effective_to
			and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') between ar3.effective_from and ar3.effective_to
			and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') between ar4.effective_from and ar4.effective_to))
	) final_obsolescence_calc
	on m_.model_id = final_obsolescence_calc.model_id
left join
	(
	SELECT model_id, LISTAGG(status, ',') WITHIN GROUP (ORDER BY status) as STATUS
	FROM
		(
		SELECT bi.model_id, bp.bpmn_key_desc as status
		FROM bpmn_instances bi
		JOIN bpmn_processes bp
		ON bi.bpmn_key_id = bp.bpmn_key_id
		WHERE bi.effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS') 

		UNION ALL

		SELECT
			model_id,
			CASE
				WHEN artefact_id = 52 AND artefact_string_value = 'Нет, доработки не актуальны' THEN 'Модель не эффективна в бизнес-процессе'
				WHEN artefact_id = 174 AND (artefact_string_value is null OR artefact_string_value = 'false') THEN 'Модель разработана, не внедрена'
				WHEN artefact_id = 201 AND (artefact_value_id IN (314, 315)) THEN artefact_string_value
				WHEN artefact_id = 367 AND (artefact_value_id IN (519)) THEN 'Разработана, не внедрена'
				WHEN artefact_id = 373 AND (artefact_value_id IN (411)) THEN 'Разработана, не внедрена'
				WHEN artefact_id = 323 AND (artefact_value_id IN (426)) THEN 'Архив'
				WHEN artefact_id = 351 AND (artefact_value_id IN (399)) THEN 'Архив'
				WHEN artefact_id = 152 AND (artefact_value_id IN (35)) THEN 'Архив'
				WHEN artefact_id = 323 AND (artefact_value_id IN (427)) THEN 'Разработана, не внедрена'
			END AS status
		FROM artefact_realizations
		WHERE
			effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')
			AND
				(
				artefact_id = 52 AND artefact_string_value = 'Нет, доработки не актуальны'
				OR artefact_id = 174 and (artefact_string_value is null or artefact_string_value = 'false')
				OR artefact_id = 201 and (artefact_value_id in (314, 315))
				OR artefact_id = 367 AND (artefact_value_id IN (519))
            	OR artefact_id = 373 AND (artefact_value_id IN (411))
				OR artefact_id = 323 AND (artefact_value_id IN (426, 427))
				OR artefact_id = 351 AND (artefact_value_id IN (399))
				OR artefact_id = 152 AND (artefact_value_id IN (35))
				)
		)
	GROUP BY model_id
	) status_
	on m_.model_id = status_.model_id
)
select 
	t1.R_NUM, -- Номер строки
	t1.COMPANY_GROUP, -- Компания группы
	t1.MODEL_NAME, -- Название модели
	t1.ROOT_MODEL_ID, -- Идентификатор модели
	t1.status, -- Статус
	t1.MODEL_VERSION, -- Версия модели
	t1.MODEL_TYPE_LEV1, -- Тип модели (1-й уровень)
	t1.MODEL_TYPE_LEV2, -- Тип модели (2-й уровень)
	t1.MODEL_SEGMENT_VALID, -- Сегмент модели
	t1.SIGN_ADJACENCY, -- Признак смежности моделей
	t1.VALIDATION_RESULT, -- Результат валидации
	t1.mr_rate_segment, -- Результат по МР для сегмента (учет PD и LGD)
	t1.mr_sign_excessive_conservatism, -- Признак избыточной конервативности, покрывающей 100% риска
	t1.date_KUORR, -- Дата валидации/ ре-калибровки
	t1.mr_rate_a_obsolescence_calc, -- Коэф А. - расчетный - устаревания
	t1.mr_test_result_1, -- 1.Полнота описания допущений и ограничений_valid
	t1.mr_comment_test_result_1, -- Комментарий к результату теста 1_valid
	t1.mr_test_result_2, -- 2.Однозначно ли разработчик определил сегмент разработки и насколько данные, используемые для построения, соответствуют этому сегменту_valid
	t1.mr_comment_test_result_2, -- Комментарий к результату теста 2_valid
	t1.mr_test_result_3, -- 3.Наличие существенной информации, которая могла бы повлиять на работу модели, но не вошла в разработку_valid
	t1.mr_comment_test_result_3, -- Комментарий к результату теста 3_valid
	t1.mr_test_result_4, -- 4.Наличие осознания о переобучаемости модели, применение/неприменение консервативных надбавок (иследовался ли разработчиком этот аспект, другие замечания по структуре и дизайну модели_valid
	t1.mr_comment_test_result_4, -- Комментарий к результату теста 4_valid
	t1.mr_test_result_5, -- 5.Качество ранжирования/результаты прохождения бэк тестирования_valid
	t1.mr_comment_test_result_5, -- Комментарий к результату теста 5_valid
	t1.mr_test_result_6, -- 6.Стабильность ранжирования/результатов бэктестирования_valid
	t1.mr_comment_test_result_6, -- Комментарий к результату теста 6_valid
	t1.mr_test_result_7, -- 7.По сегменту применения: стабильность, репрезентативность, однородность_valid
	t1.mr_comment_test_result_7, -- Комментарий к результату теста 7_valid
	t1.mr_test_result_8, -- 8.Калибровка, недооценка/переоценка риска и другие существенные замечания, количественного анализа/консервативность модели_valid
	t1.mr_comment_test_result_8, -- Комментарий к результату теста 8_valid
	t1.mr_test_result_9, -- 9.Соответствие разработки и применения модели в части технической реализации расчета (в том числе приёмо-сдаточные испытания), потоков данных, сегмента применения_valid
	t1.mr_comment_test_result_9, -- Комментарий к результату теста 9_valid
	t1.mr_test_result_10, -- 10.Контроль качества входных данных, используемых при применении модели в ИТ системе_valid
	t1.mr_comment_test_result_10, -- Комментарий к результату теста 10_valid
	t1.mr_test_result_11, -- 11.Недостатки и изменения, выявленные в части процесса применения модели._valid
	t1.mr_comment_test_result_11, -- Комментарий к результату теста 11_valid
	t1.mr_test_result_12, -- 12.Недостатки и изменения, выявленные в части процесса применения модели._valid
	t1.mr_comment_test_result_12, -- Комментарий к результату теста 12_valid
	t1.mr_test_result_1_ds, -- 1.Полнота описания допущений и ограничений_ds
	t1.mr_comment_test_result_1_ds, -- Комментарий к результату теста 1_ds
	t1.mr_test_result_2_ds, -- 2.Однозначно ли разработчик определил сегмент разработки и насколько данные, используемые для построения, соответствуют этому сегменту_ds
	t1.mr_comment_test_result_2_ds, -- Комментарий к результату теста 2_ds
	t1.mr_test_result_3_ds, -- 3.Наличие существенной информации, которая могла бы повлиять на работу модели, но не вошла в разработку_ds
	t1.mr_comment_test_result_3_ds, -- Комментарий к результату теста 3_ds
	t1.mr_test_result_4_ds, -- 4.Наличие осознания о переобучаемости модели, применение/неприменение консервативных надбавок (иследовался ли разработчиком этот аспект, другие замечания по структуре и дизайну модели_ds
	t1.mr_comment_test_result_4_ds, -- Комментарий к результату теста 4_ds
	t1.mr_test_result_5_ds, -- 5.Качество ранжирования/результаты прохождения бэк тестирования_ds
	t1.mr_comment_test_result_5_ds, -- Комментарий к результату теста 5_ds
	t1.mr_test_result_6_ds, -- 6.Стабильность ранжирования/результатов бэктестирования_ds
	t1.mr_comment_test_result_6_ds, -- Комментарий к результату теста 6_ds
	t1.mr_test_result_7_ds, -- 7.По сегменту применения: стабильность, репрезентативность, однородность_ds
	t1.mr_comment_test_result_7_ds, -- Комментарий к результату теста 7_ds
	t1.mr_test_result_8_ds, -- 8.Калибровка, недооценка/переоценка риска и другие существенные замечания, количественного анализа/консервативность модели_ds
	t1.mr_comment_test_result_8_ds, -- Комментарий к результату теста 8_ds
	t1.mr_ratio_k_validation, -- Коэф К модели Валидация
	t1.mr_ratio_k_develop, -- Коэф К модели Разработка
	t1.mr_ratio_k_result, -- Коэф К модели Итог
	t1.mr_ratio_k_process_analysis, -- Коэф К анализа процессов
	t1.mr_rate_k, -- К без признака смежности сигнала на уровне сигнала по модели
	t1.mr_ratio_k_proces_models, -- Коэф К модели и процесса
	coalesce(t2.mr_rate_adjacency, 'Нет данных') as mr_rate_adjacency, -- Коэф с учетом смежности на желтых на уровне коэффициентов
	case 
		when t1.mr_rate_a_obsolescence_calc = 'Нет данных' 
			then coalesce(t2.mr_rate_adjacency, 'Нет данных')
		when t2.mr_rate_adjacency is not null and to_number(replace(t1.mr_rate_a_obsolescence_calc, ',', '.')) * to_number(replace(t2.mr_rate_adjacency, ',', '.')) < 1
			then replace(ltrim(to_char(to_number(replace(t1.mr_rate_a_obsolescence_calc, ',', '.')) * to_number(replace(t2.mr_rate_adjacency, ',', '.')), '0.9999')), ',', '.')
		else '1' end as mr_ratio_k_final_obsolescence_calc -- Итоговое значение коэф к модели и процесса (с учетом устаревания) расчетное
from pre_adj_rep t1 
left join
	(
	select 
		coalesce(case when SIGN_ADJACENCY = 'Нет данных' then NULL else SIGN_ADJACENCY end, 'model' || root_model_id || '-v' || model_version) as model_adj,
		max(case when mr_ratio_k_proces_models = 'Нет данных' then NULL else mr_ratio_k_proces_models end) as mr_rate_adjacency
	from pre_adj_rep
	group by 
		coalesce(case when SIGN_ADJACENCY = 'Нет данных' then NULL else SIGN_ADJACENCY end, 'model' || root_model_id || '-v' || model_version)
	) t2
	on coalesce(case when t1.SIGN_ADJACENCY = 'Нет данных' then NULL else t1.SIGN_ADJACENCY end, 'model' || t1.root_model_id || '-v' || t1.model_version) = t2.model_adj
-- Фильтры
where t1.models_is_active_flg = '1'
	and -- дата среза
		(:slice is null
		or :slice is not null
			and to_timestamp(cast(:slice as varchar2(4000)), 'YYYY-MM-DD') >= to_timestamp(t1.create_date))
	and -- Итоговое значение Коэф К-модели и процесса (с учетом устаревания)  (выбор диапазона)
		(
			t1.mr_ratio_k_final_obsolescence_calc is null
			or TO_NUMBER(t1.mr_ratio_k_final_obsolescence_calc) between coalesce(TO_NUMBER(:mr_ratio_k_final_obsolescence_from), 0)
				and coalesce(TO_NUMBER(:mr_ratio_k_final_obsolescence_to), 100)
		)
	and -- Использование для расчета ЭК
		(
			:mr_sign_ek_filter is null
			or (:mr_sign_ek_filter is not null and t1.mr_sign_ek = 'true')
		)
	and -- Дата валидации/ ре-калибровки (выбор диапазона)
		(
			cast(coalesce(to_timestamp(case when t1.date_KUORR = 'Нет данных' then NULL else t1.date_KUORR end, 'DD.MM.YYYY HH24:MI'), to_timestamp('1900-01-0100:00:00','yyyy-mm-ddhh24:mi:ss')) as date) between
				to_timestamp(cast(coalesce(:date_KUORR_from, '1900-01-01') as varchar2(4000)), 'YYYY-MM-DD')
				and
				to_timestamp(cast(coalesce(:date_KUORR_to, '5999-12-30') as varchar2(4000)), 'YYYY-MM-DD') + 1
		)
	and -- Результат по МР для сегмента (учет PD и LGD)
		(
			(:mr_rate_segment_from IS NULL AND :mr_rate_segment_to IS NULL)
			or TO_NUMBER(t1.mr_rate_segment) between coalesce(TO_NUMBER(:mr_rate_segment_from), 0)
				and coalesce(TO_NUMBER(:mr_rate_segment_to), 2)
		)
	and -- название модели
		(
			upper(t1.model_name) like '%' || upper(:model_tmpl) || '%'
			or :model_tmpl is null or :model_tmpl = ''
		)
	and -- сегмент модели
		(
			upper(t1.MODEL_SEGMENT_VALID) like '%' || upper(:model_segment_valid_template) || '%'
			or :model_segment_valid_template is null or :model_segment_valid_template = ''
		)
	and -- вид/подвид риска
		(
			:model_type_id_filter is null
			or t1.model_id in
				(

					select
						distinct fct.model_id
					from
					(
						select
							ar.model_id,
							ar.artefact_value_id
						from artefact_realizations ar
						inner join models m
							on ar.model_id = m.model_id
								and m.models_is_active_flg = '1'
						where ar.artefact_id = 173
							and ar.effective_to = to_timestamp('9999-12-3123:59:59','yyyy-mm-ddhh24:mi:ss')
					) fct
					inner join
					(
						select
							Regexp_Substr(:model_type_id_filter, '[^,]+', 1, Level) as filter_id
						from dual
						Connect by Regexp_Substr(:model_type_id_filter, '[^,]+', 1, Level) Is Not Null
					) flt
					on fct.artefact_value_id = flt.filter_id

				)
		)
	and -- статус
		(
			:status_filter is null
			or t1.model_id in
				(
					SELECT model_id from
					(
						select distinct
						t1.model_id,
						Regexp_Substr(t1.status, '[^,]+', 1, Level) status
						from dual
						Connect by Regexp_Substr(t1.status, '[^,]+', 1, Level) Is Not Null
					) models_temp
					inner join
					(
						select
						Regexp_Substr(:status_filter, '[^,]+', 1, Level) filter_id
						from dual
						Connect by Regexp_Substr(:status_filter, '[^,]+', 1, Level) Is Not Null
					) filters
					ON models_temp.status = filters.filter_id
				)
		)
	and -- id_модели
		(
			:root_model_id_filter is null
			or t1.model_id in
				(
					select
						Regexp_Substr(:root_model_id_filter, '[^,]+', 1, Level) filter_id
					from dual
					Connect by Regexp_Substr(:root_model_id_filter, '[^,]+', 1, Level) Is Not Null
				)
		)
		
	and -- признак смежности модели
		(
			:SIGN_ADJACENCY_filter is null
			or t1.SIGN_ADJACENCY in
				(
					select
						Regexp_Substr(:SIGN_ADJACENCY_filter, '[^,]+', 1, Level) filter_id
					from dual
					Connect by Regexp_Substr(:SIGN_ADJACENCY_filter, '[^,]+', 1, Level) Is Not Null
				)
		)
	and -- результат валидации
		(
			:VALIDATION_RESULT_filter is null
			or t1.VALIDATION_RESULT in
				(
					select
						Regexp_Substr(:VALIDATION_RESULT_filter, '[^,]+', 1, Level) filter_id
					from dual
					Connect by Regexp_Substr(:VALIDATION_RESULT_filter, '[^,]+', 1, Level) Is Not Null
				)
		)
	and -- Компания группы
		(
			:company_group_id_filter is null
			or t1.model_id in
				(

					select
						distinct fct.model_id
					from
					(
						select
							ar.model_id,
							ar.artefact_value_id
						from artefact_realizations ar
						inner join models m
							on ar.model_id = m.model_id
								and m.models_is_active_flg = '1'
						where ar.artefact_id = 73
							and ar.effective_to = to_timestamp('9999-12-3123:59:59','yyyy-mm-ddhh24:mi:ss')
					) fct
					inner join
					(
						select
							Regexp_Substr(:company_group_id_filter, '[^,]+', 1, Level) as filter_id
						from dual
						Connect by Regexp_Substr(:company_group_id_filter, '[^,]+', 1, Level) Is Not Null
					) flt
					on fct.artefact_value_id = flt.filter_id

				)
		)
`
module.exports = sql