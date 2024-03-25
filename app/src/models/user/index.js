const sql = require('./sql');
const { groupResponse } = require('./helpers/cards');

class User {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  lead = async (user) => {
    const { groups, token } = user;
    const leads = groups.filter((g) => g.split('lead').length > 1);

    if (!leads.length) return null;

    const subGroups = leads.map((l) => l.split('_lead')[0]);
    const users = await Promise.all(subGroups.map((item) => this.integration.keycloak.usersByGroup(item, token)));
    // Список задач
    const camundaTasks = await this.bpmn.tasks(groups);
    const ids = camundaTasks.map((item) => item.processInstanceId).join(',');

    const taskModels = await db
      .execute({
        sql: models.registry.instance,
        args: { ids },
      })
      .then((d) => d.rows);

    return {
      users: users.reduce((prev, curr) => [...prev, ...curr], []),
      tasks: camundaTasks
        .map((t) => {
          t.MODEL = taskModels.find((m) => m.BPMN_INSTANCE_ID === t.processInstanceId);
          return t;
        })
        .filter((t) => t.MODEL),
    };
  };

  addLead = async (model_id, dept, mipm, business_customer) => {
    const leadGroups = ['de_lead', 'validator_lead', 'modelops_lead'];

    const mipmUser = {
      group: 'mipm',
      username: mipm,
    };
    const businessCustomerUser = {
      group: 'business_customer',
      username: business_customer,
    };

    if (!mipmUser) throw new Error('mipm not found');
    const leads = await this.integration.keycloak.getUsersByGroupsSystem(leadGroups);

    const dsLead = await this.integration.keycloak.getDsLead(dept);

    const args = leads
      .concat(businessCustomerUser)
      .concat(dsLead)
      .concat(mipmUser)
      .filter((d) => d.username)
      .map((item) => ({
        MODEL_ID: model_id,
        FUNCTIONAL_ROLE: item.group,
        LEAD_NAME: mipmUser.username,
        ASSIGNEE_NAME: item.username,
      }));
    return this.db
      .executeMany({
        sql: sql.lead,
        args,
      })
      .then((d) => console.log(d));
  };

  removeUser = ({ MODEL_ID, user }) =>
    this.db.execute({
      sql: sql.remove,
      args: {
        MODEL_ID,
        ...user,
      },
    });

  addUser = ({ MODEL_ID, user }, lead) =>
    this.db.execute({
      sql: sql.add,
      args: {
        MODEL_ID,
        FUNCTIONAL_ROLE: user.group,
        LEAD_NAME: lead.username,
        ASSIGNEE_NAME: user.username,
      },
    });

  card = (MODEL_ID) =>
    this.db
      .execute({
        sql: sql.card,
        args: { MODEL_ID },
      })
      .then((d) => {
        return d.rows.map((obj) => {
          return {
            username: obj.USERNAME,
            role: obj.ROLE,
            lead: obj.LEAD,
            ...obj
          }
        });
      });

  cardsBatch = (models) => {
    return this.db
      .execute({
        sql: sql.cardsBatch,
        args: {
          models,
        },
      })
      .then((d) => {
        return d.rows.map((obj) => {
          return {
            username: obj.USERNAME,
            role: obj.ROLE,
            lead: obj.LEAD,
            ...obj
          }
        });
      })
      .then((data) => groupResponse(data, models));
  };

  all = () =>
    this.db
      .execute({
        sql: sql.all,
        args: {},
      })
      .then((d) => d.rows);

  role = (group) => {
    return this.db
      .execute({
        sql: sql.role,
        args: { group_name: group },
      })
      .then((d) => d.rows);
  };
}

module.exports = User;
