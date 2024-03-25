const card = require('./card');
const assignment = require('./assignment');
const user = require('./user');

module.exports = (context) => ({
  card: card(context.db.card, context.user),
  assignment: assignment(context.db.assignment, context.user),
  user: user(context.db.user),
});
