const xlsx = require('excel4node')

const status = {
  main: "Процесс родитель",
  initialization: "Инициализация",
  model: "Разработка модели",
  data: "Данные",
  data_build: "Разработка витрины",
  data_search: "Поиск данных",
  monitoring: "Мониторинг",
  validation: "Внедрена",
  integration: "Внедрение",
  data_pilot: "Пилот данных",
  model_validation: "Первичная валидация",
  integration_datamart: "Разработка промышленной витрины",
  integration_env_conf: "Настройка среды применения",
  integration_test: "Тестирование ДИТ",
  integration_user: "Пользовательское тестирование",
  integration_prod: "Перенос на промышленный стенд",
  monitoring_auto_correct: "Автоматизированная корректировка",
  removal: "Вывод модели из эксплуатации",
  cancel: "Отмена разработки модели",
  jira: "Создание задачи Jira",
  developed_not_implemented: "Разработана, не внедрена",
  rollback_version: "",
  rollback: "Откат",
  fast_model_process: "Сокращенное заведение разработанных моделей",
  model_pilot: "Пилотирование модели",
  fullvalidation_datamart: "Разработка витрины для полной валидации",
  inegration_model: "Продуктивизация модели",
  test_preprod_transfer_prod: "Тестирование на препрод и перенос на прод контур",
  fullvalidation: "Полная валидация",
};

const setCellValue = (cell, header, item) => {
  if (header?.type === "link") {
    cell.link(item[header.key]);
  } else if (header?.type === "number") {
    cell.number(item[header.key]);
  } else {
    cell.string(
      item[header.key]
        ? ["model_status"].includes(header.key.toString().toLowerCase()) &&
          status[item[header.key]]
          ? status[item[header.key]].toString()
          : item[header.key].toString()
        : "Нет данных"
    );
  }
};

const cutWorksheetName = (name) => {
  const EXCEL_LIMIT_WORKSHEET_NAME_LENGTH = 31;

  return name.slice(0, EXCEL_LIMIT_WORKSHEET_NAME_LENGTH).trim();
};

module.exports = async (req, res, next) => {
    try {
        const { report, params } = req.body
        const { db, user } = req.context
        // Get Data by report name
        const { pagesHeaders, pagesData } = await db.report[report](params, user)

        // Create Excel
        const wb = new xlsx.Workbook()

        pagesData.forEach((pageData, index) => {
            const { name, headers } = pagesHeaders[index]

            // NOTE: Excel has a limit on the character count of worksheet names (31)
            const ws = wb.addWorksheet(cutWorksheetName(name))

            ws.row(1).filter()
            headers.reduce((p, c, i) => {
                ws.column(1 + i).setWidth(c.title.length + 15)
                ws.cell(1, 1 + i).string(c.title)
                return null
            }, null)

            pageData.reduce((_, item, i) => {
                headers.reduce((_, h, j) => {
                    setCellValue(ws.cell(2 + i, 1 + j), h, item)
                    return null
                }, null)
                return null
            }, null)
        })

        wb.write('report.xlsx', res)
    } catch (error) {
        console.error('Error generating report:', error.message)
        res.status(500).json({
            error: 'An error occurred while generating the report. Please try again later.',
            details: error.message
        })
    }
}
