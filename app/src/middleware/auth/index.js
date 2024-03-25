const session = require('express-session');
const Keycloak = require('keycloak-connect');

const config = {
  realm: process.env.KEYCLOAK_REALMS,
  'auth-server-url': `${process.env.KEYCLOAK_URL}auth`,
  'ssl-required': 'none',
  resource: process.env.KEYCLOAK_CLIENT,
  'bearer-only': true,
};

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, config);
const session_params = {
  store: memoryStore,
  secret: process.env.SECRET || 'thisShouldBeLongAndSecret',
  resave: false,
  saveUninitialized: true,
};

module.exports = {
  keycloak,
  sessionMiddleware: () => session(session_params),
  authMiddleware: (req, res, next) => {
    const { content: context, token } = req.kauth.grant.access_token;

    if (!req.context) { 
      req.context = {}
    };

    req.context.user = {
      id: context.sub || null,
      session: context.session_state,
      name: context.preferred_username,
      username: context.preferred_username,
      email: context.email,
      camundaID: `${context.preferred_username} (${context.email})`,
      keycloakGroups: context.groups,
      family_name: context.family_name || '',
      given_name: context.given_name || '',
      preferred_username: context.preferred_username,
      groups: context.groups
        .reduce((prev, group) => {
          const newGroup = group.split('/');
          prev.push(...newGroup);
          return prev;
        }, [])
        .filter((d) => d)
        .filter((d, i, a) => a.indexOf(d) === i && d),
      roles: context.roles || [],
      token,
    };

    next();
  },
};
