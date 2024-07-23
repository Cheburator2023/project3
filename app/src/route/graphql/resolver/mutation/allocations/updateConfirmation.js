module.exports = async (root, args, context) => {
  const { MODEL_ID, DATA } = args;

  const updatedUsageData = await context.db.allocations.updateModelUsageConfirmation({
    MODEL_ID,
    DATA
  });

  await context.db.allocations.updateModelUsageConfirmationHistory({
    DATA: updatedUsageData,
    USER: context.user
  });

  return true;
};
