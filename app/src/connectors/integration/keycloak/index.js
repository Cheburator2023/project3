const fetch = require('isomorphic-fetch')
const qs = require('qs');
const querystring =  require('querystring')
const auditClient = require('../../../utils/audit/auditClient');
const tslgLogger = require('../../../utils/logger')

const connector = require('./connector')

const keycloakHost = process.env.KEYCLOAK_URL
const keycloakClient = process.env.KEYCLOAK_CLIENT
const keycloakUser = process.env.KEYCLOAK_USER
const keycloakPwd = process.env.KEYCLOAK_PWD
const realms = process.env.KEYCLOAK_REALMS || 'cym'


class Keycloak {

    getToken = async () => {
        const username = keycloakUser;
        const password = keycloakPwd;
        const initiator = {
            sub: username,
            channel: 'keycloak',
            realm: realms,
            method: 'authenticate'
        };
        let correlationId = null;
        // Старт аудита
        try {
            correlationId = await auditClient.start('SUMD_AUTH', initiator, { username, realm: realms });
        } catch (auditStartError) {
            tslgLogger.error('Ошибка старта аудита (getToken)', 'AuditStartError', auditStartError);
        }

        let data;
        try {
            const response = await fetch(
                `${keycloakHost}auth/realms/${realms}/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: qs.stringify({
                        grant_type: 'password',
                        client_id: keycloakClient,
                        username,
                        password
                    })
                }
            );
            data = await response.json();
        } catch (fetchError) {
            // Ошибка сети или парсинга – отправляем failure и пробрасываем исключение
            try {
                await auditClient.failure('SUMD_AUTH', correlationId, fetchError, initiator, { username, realm: realms });
            } catch (auditFailureError) {
                tslgLogger.error('Ошибка отправки failure аудита (getToken)', 'AuditFailureError', auditFailureError);
            }
            throw fetchError;
        }

        if (data.access_token) {
            // Успешная аутентификация – аудит success
            try {
                await auditClient.success('SUMD_AUTH', correlationId, initiator, { username, realm: realms });
            } catch (auditSuccessError) {
                tslgLogger.error('Ошибка отправки success аудита (getToken)', 'AuditSuccessError', auditSuccessError);
            }
            return data.access_token;
        } else {
            // Ошибка аутентификации – аудит failure
            const error = new Error(data.error || 'Unknown error');
            try {
                await auditClient.failure('SUMD_AUTH', correlationId, error, initiator, { username, realm: realms });
            } catch (auditFailureError) {
                tslgLogger.error('Ошибка отправки failure аудита (getToken)', 'AuditFailureError', auditFailureError);
            }
            throw error;
        }
    }

    getTokenByUsername = async (username, password) => {
        const initiator = {
            sub: username,
            channel: 'keycloak',
            realm: realms,
            method: 'authenticate'
        };
        let correlationId = null;
        try {
            correlationId = await auditClient.start('SUMD_AUTH', initiator, { username, realm: realms });
        } catch (auditStartError) {
            tslgLogger.error('Ошибка старта аудита (getTokenByUsername)', 'AuditStartError', auditStartError);
        }

        let data;
        try {
            const response = await fetch(
                `${keycloakHost}auth/realms/${realms}/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: qs.stringify({
                        grant_type: 'password',
                        client_id: keycloakClient,
                        username,
                        password
                    })
                }
            );
            data = await response.json();
        } catch (fetchError) {
            try {
                await auditClient.failure('SUMD_AUTH', correlationId, fetchError, initiator, { username, realm: realms });
            } catch (auditFailureError) {
                tslgLogger.error('Ошибка отправки failure аудита (getTokenByUsername)', 'AuditFailureError', auditFailureError);
            }
            throw fetchError;
        }

        if (data.access_token) {
            try {
                await auditClient.success('SUMD_AUTH', correlationId, initiator, { username, realm: realms });
            } catch (auditSuccessError) {
                tslgLogger.error('Ошибка отправки success аудита (getTokenByUsername)', 'AuditSuccessError', auditSuccessError);
            }
            return data.access_token;
        } else {
            const error = new Error(data.error || 'Unknown error');
            try {
                await auditClient.failure('SUMD_AUTH', correlationId, error, initiator, { username, realm: realms });
            } catch (auditFailureError) {
                tslgLogger.error('Ошибка отправки failure аудита (getTokenByUsername)', 'AuditFailureError', auditFailureError);
            }
            return data;
        }
    }

    getUsersByGroupSystem = name => this
        .getToken()
        .then(token => this.usersByGroup(name, token))

    getUsersByGroupsSystem = groups => Promise
        .all(
            groups.map(g => this.getUsersByGroupSystem(g))
        )
        .then(data => data
            .reduce(
                (prev, curr) => [...prev, ...curr],
                []
            )
        )

    getUser = id => this
        .getToken()
        .then(token => connector({
            path: `auth/admin/realms/${realms}/users/${id}`,
            method: 'GET',
            token
        }))

    getUsersByUsername = (username) => this
        .getToken()
        .then(token => connector({
            path: `auth/admin/realms/${realms}/users/?${querystring.stringify({ username })}`,
            method: 'GET',
            token
        }))

    searchUsers = ({ search, first = 0, max = 100 }, { token }) => connector({
        path: `auth/admin/realms/${realms}/users?${querystring.stringify({
            search,
            first,
            max
        })}`,
        method: 'GET',
        token
    })

    getDsLead = async dept => {
        const dsUsers = await this.getUsersByGroupSystem(dept)
        const dsLeads = await this.getUsersByGroupSystem('ds_lead')

        return dsLeads.filter(user => dsUsers.filter(u => u.id === user.id).length)
            .map(user => ({
                ...user,
                group: 'ds_lead'
            }))
    }

    isLead = group =>
        group.split('lead').length > 1
            ? group.split('_lead')[0]
            : null

    dsDepartment = groups => {
        const dsDept = groups.find(
            group => group.toLowerCase().split('departament/').length > 1
        )

        if (dsDept) {
            const data = dsDept.split('/')
            return dsDept.split('/')[data.length - 1]
        }
        return null
    }

    usersLead = ({ groups, keycloakGroups }, { token }) => Promise
        .all(
            groups
                .filter(g => g.split('lead').length > 1)
                .map(l => l.split('_lead')[0])
                .map(
                    item => item === 'ds_lead'
                        ? this.getDsLead(this.dsDepartment(keycloakGroups))
                        : this.usersByGroup(
                            item === 'ds' ? this.dsDepartment(keycloakGroups) : item,
                            token,
                            item === 'ds' ? true : false,
                            item === 'ds_lead' ? true : false
                        )
                )
        )
        .then(data => data
            .reduce(
                (prev, curr) => [...prev, ...curr],
                []
            )
        )

    usersByGroups = ({ groups }, { token, keycloakGroups }) => Promise
        .all(
            groups.map(
                item => {
                    switch(item) {
                        case 'ds':
                            return this.usersByGroup(
                                this.dsDepartment(keycloakGroups),
                                token,
                                item === 'ds' ? true : false,
                                item === 'ds_lead' ? true : false
                            )
                        case 'ds_lead':
                            return this.getDsLead(this.dsDepartment(keycloakGroups))
                        default:
                            return this.usersByGroup(item, token)

                    }
                }
            )
        )
        .then(data => data
            .reduce(
                (prev, curr) => [...prev, ...curr],
                []
            )
        )


    usersByGroup = (name, token, is_ds_flg, is_ds_lead_flg) => !name ? [] :
        connector({
            path: `auth/admin/realms/${realms}/groups?${querystring.stringify({ search: name })}`,
            token
        })
        .then(data => {
            const mainGroup = data.filter(d => d.name === name)
            const subGroup = data.reduce((prev, curr) => {
                const groups = curr.subGroups.filter(d => d.name === name)
                return prev.concat(groups)
            }, [])

            const searchGroup = mainGroup.concat(subGroup).filter(d => d.name === name)

            if (searchGroup.length > 0)
                return searchGroup[0].id
            throw new Error('group not found')
        })
        .then(async d =>
            connector({
                path: `auth/admin/realms/${realms}/groups/${d}/members`,
                token
            })
        )
        .then(data => data.map(item => {
            item.group = is_ds_flg ? 'ds' : name
            item.group = is_ds_lead_flg ? 'ds_lead' : item.group

            return item
        }))
        .catch(e => {
            return []
        })


    info = (id, { token }) => connector
        ({
            path: `auth/admin/realms/${realms}/users/${id}/groups`,
            token
        })
        .then(data => data.map(item => item.name))

    userLead = async user => {
        user.groups = user.groups.map(d => `${d}_lead`)
        return this.usersByGroups(user, user)
    }

    groups = ({ token }) => connector({
        path: `auth/admin/realms/${realms}/groups`,
        token
    })

    me = token => connector({
        path: `auth/realms/${realms}/protocol/openid-connect/userinfo`,
        token
    })

    getSubGroupsByGroupsName = (groupNames = []) => this
        .getToken()
        .then(token => {
            return connector({
                path: `auth/admin/realms/${ realms }/groups`,
                token
            })
        })
        .then(groups => {
            const subGroups = []
            for (const group of groups) {
                if (!groupNames.includes(group.name)) {
                    continue
                }

                if (!group.subGroups || !group.subGroups.length) {
                    continue
                }

                for (const subGroup of group.subGroups) {
                    subGroups.push(subGroup)
                }
            }

            return subGroups
        })
        .catch(e => {
            console.error(e)
            return []
        })

    getUsersInGroup = (groupId) => this
        .getToken()
        .then(token => {
            return connector({
                path: `auth/admin/realms/${ realms }/groups/${ groupId }/members`,
                token
            })
        })
        .catch(e => {
            console.error(e)
            return []
        })
}

module.exports = Keycloak
