// Group resopsen by MODEL_ID in specified models order
const groupResponse = (response = [], models = []) => {
  return models.map((model) => {
    const group = response.filter((item) => item.MODEL_ID === model);

    return group;
  });
};

module.exports = {
  groupResponse,
};