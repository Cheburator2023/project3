const scheduler = require('node-schedule');
const rule = new scheduler.RecurrenceRule();
const tslgLogger = require('../../utils/logger');

const sql1 = require('./sql1');
const sql2 = require('./sql2');

// your timezone
rule.tz = 'Europe/Moscow';
// Set hour
rule.hour = 00;
// Set minute
rule.minute = 00;
// Set second
rule.second = 00;
// Days of week
rule.dayOfWeek = new scheduler.Range(0, 5);

module.exports = async (db) => scheduler.scheduleJob(rule, async function () {
  tslgLogger.sys('Перерасчет коэффициента MR.');

  try {
    const result = await db.execute({
      sql: sql1,
      args: {},
    }).then(data => {
      tslgLogger.info('Шаг 1 перерасчета коэффициента MR выполнен успешно', 'ПерерасчетMR', {
        rowsAffected: data?.rowCount || 0
      });

      const status = true;

      if (status) {
        return db.execute({
          sql: sql2,
          args: {},
        });
      }

      throw new Error('Ошибка шага 1.');
    }).then(data => {
      tslgLogger.info('Шаг 2 перерасчета коэффициента MR выполнен успешно', 'ПерерасчетMR', {
        rowsAffected: data?.rowCount || 0
      });
      return 'success';
    });

    tslgLogger.sys(`Перерасчет коэффициента MR завершен. Статус: ${result}.`);
  } catch (e) {
    tslgLogger.error('Ошибка перерасчета коэффициента MR', 'ОшибкаПерерасчетаMR', e);
  }
});
