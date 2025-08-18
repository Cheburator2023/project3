const Keycloak = require('./keycloak')
const Git = require('./git')
const Smtp = require('./smtp')
const Jira = require('./jira')
const Teamcity = require('./teamcity')
const Kafka = require('./kafka')
const SumRM = require('./sumrm')

module.exports = {
    keycloak: new Keycloak(),
    git: new Git(),
    smtp: new Smtp(),
    jira: new Jira(),
    teamcity: new Teamcity(),
    kafka: new Kafka(),
    sumrm: new SumRM()
}