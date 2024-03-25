const sql = `
    SELECT
        t1.*
    FROM BPMN_INSTANCES t1
    INNER JOIN BPMN_INSTANCES t2
        on t1.MODEL_ID = t2.MODEL_ID
        and t1.BPMN_KEY_ID = t2.BPMN_KEY_ID
        and t2.BPMN_INSTANCE_ID = :BPMN_INSTANCE_ID
    ORDER BY
        t1.EFFECTIVE_TO
`;

module.exports = async (parent, agrs, { bpmn, db }) => {
  const ids = await db.instance.db
    .execute({
      sql,
      args: { BPMN_INSTANCE_ID: parent.id },
    })
    .then((d) => d.rows.map((item) => item.BPMN_INSTANCE_ID));

  const data = (
    await Promise.all(
      [...ids, parent.id].map(async (id) => await bpmn.activity(id))
    )
  ).reduce((prev, curr) => prev.concat(curr), []);

  const active = data.reduce((prev, d, i, arr) => {
    if (d.endTime) return prev;
    d.prevActivity = arr.filter((item) => item.activityId === d.activityId);
    prev.push(d);
    return prev;
  }, []);

  const activeIds = active.map((d) => d.activityId);

  const resolveData = data.reduce((prev, d) => {
    if (activeIds.includes(d.activityId)) {
      prev.push(...active.filter((item) => item.activityId === d.activityId));
      return prev;
    }

    const { startTime } = d;
    const startTimeInt = new Date(startTime).getTime();

    const check = active.reduce((aprev, acurr) => {
      const aCheck =
        acurr.prevActivity.filter(
          (aitem) => startTimeInt <= new Date(aitem.startTime).getTime()
        ).length === acurr.prevActivity.length;

      return prev && aCheck;
    }, true);

    if (
      check ||
      [
        "Инициализация бизнес-процесса",
        "Инициализация бизнес процесса",
      ].includes(d.activityName)
    )
      prev.push(d);

    return prev;
  }, []);

  return resolveData;
};
