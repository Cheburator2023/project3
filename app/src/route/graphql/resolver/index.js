const Query = require('./query')
const Mutation = require('./mutation')
const graphqlTypes = require('./type')

const resolvers = {
    Query,
    Mutation,
    ...graphqlTypes
};

module.exports = resolvers