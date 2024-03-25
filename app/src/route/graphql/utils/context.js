const getLoaders = require('../resolver/loaders');

module.exports = ({ req }) => {
  req.context.loaders = getLoaders(req.context);
  return req.context;
}