const DataLoader = require('dataloader');

module.exports = (user) => ({
  users: new DataLoader(async (models) => await user.cardsBatch(models)),
});
