module.exports = async (root, args, context) => {
  const { MODEL_ID, DATA } = args;

  // Update usage with the filtered data
  const updatedUsageData = await context.db.allocations.updateUsage({
    MODEL_ID,
    DATA
  });

  // Transform the data into updates
  const updates = DATA.flatMap(({ ALLOCATION_ID, COMMENT, PERCENTAGE }) => {
    const USAGE = updatedUsageData.find(item =>
      item.ALLOCATION_ID === ALLOCATION_ID && item.MODEL_ID === MODEL_ID
    );

    return [
      COMMENT !== undefined && { USAGE_ID: USAGE.USAGE_ID, FIELD: 'comment', VALUE: COMMENT },
      PERCENTAGE !== undefined && { USAGE_ID: USAGE.USAGE_ID, FIELD: 'percentage', VALUE: PERCENTAGE }
    ].filter(Boolean);
  });

  // Update usage history with the generated updates and user context
  await context.db.allocations.updateUsageHistory(updates, context.user);

  return true;
};
