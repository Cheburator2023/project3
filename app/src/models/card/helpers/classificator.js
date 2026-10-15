const cardArtefacts = require('./artefact');

// Get models arguments for query
const getArguments = (models) => models.reduce((acc, { MODEL_ID, TYPE }) => {
  if (TYPE) {
    acc.types = [...new Set([
      ...TYPE.split(','),
      ...acc.types
    ])];
  }

  acc.models.push(MODEL_ID);
  return acc;
}, {
  models: [],
  types: [],
});

// Group resopsen by MODEL_ID in specified models order
const groupResponse = (response = [], models = []) => {
  const groupsByModelId = new Map();

  response.forEach((item) => {
    const group = groupsByModelId.get(item.MODEL_ID);

    if (group) {
      group.push(item);
    } else {
      groupsByModelId.set(item.MODEL_ID, [item]);
    }
  });

  return models.map(({ MODEL_ID }) => {
    const group = groupsByModelId.get(MODEL_ID);

    // if has artefacts then transofrm fields, otherwise return empty array
    return group?.length
      ? cardArtefacts(group)
      : [];
  });
};

module.exports = {
  getArguments,
  groupResponse,
};
