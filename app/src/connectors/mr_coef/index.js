const scheduler = require('node-schedule');
const rule = new scheduler.RecurrenceRule();

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
  console.sys('Перерасчет коэффициента MR.');

  const result = await db.execute({
    sql: sql1,
    args: {},
  }).then(data => {
    console.log(data);
    const status = true;

    if (status) {
      return db.execute({
        sql: sql2,
        args: {},
      });
    }

    throw new Error('Ошибка шага 1.');
  }).then(data => {
    console.log(data);
    return 'success';
  }).catch(e => {
    console.log(e);
    return 'failed';
  });

  console.sys(`Перерасчет коэффициента MR. Статус: ${result}.`);
});
