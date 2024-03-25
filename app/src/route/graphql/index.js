const { ApolloServer } = require('apollo-server-express')
const { makeExecutableSchema } = require('graphql-tools')

const typeDefs = require('./schema')
const resolvers = require('./resolver')
const context = require('./utils/context')

const schema = makeExecutableSchema({ 
    typeDefs, 
    resolvers
})

const graphqlServer = new ApolloServer({ 
    schema, 
    context,
    debug: false,
    formatError: (err) => {
        console.error(err.message)
        return err;
    }
})

module.exports = graphqlServer