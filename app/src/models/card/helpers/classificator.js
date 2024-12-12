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
  return models.map((model) => {
    const group = response.filter((item) => item.MODEL_ID === model.MODEL_ID);

    console.log(group)

    // if has artefacts then transofrm fields, otherwise return empty array
    return group.length
      ? cardArtefacts(group)
      : group;
  });
};

module.exports = {
  getArguments,
  groupResponse,
};
