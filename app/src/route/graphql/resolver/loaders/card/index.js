const DataLoader = require('dataloader');

module.exports = (card, user) => ({
  classificators: new DataLoader(async (models) => await card.artefacts(models, user, '1')),
  artefacts: new DataLoader(async (models) => await card.artefacts(models, user, '-1')),
});
