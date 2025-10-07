module.exports = {
  new: require('./new'),
  update: require('./update'),
  check: require('./check'),
  model: require('./model'),
  info: require('./info'),
  version: require('./version'),
  id: require('./id'),
  key: require('./key'),
  instancesByModelId: require('./instancesByModelId'),
  instancesByModelIdAndKey: require('./instancesByModelIdAndKey'),
  deleteBpmnInstance: require('./deleteBpmnInstance'),
  getBpmnProcessByKey: require('./getBpmnProcessByKey'),
}
