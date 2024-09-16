const sql = require("./sql");
const moment = require("moment");

const {
  formatModelsDepartmentsResult,
  mappingDevDepartmentsToStreams,
  formatModelsResult,
} = require("./helpers/formatModelsResult");

const { formatUserTasks } = require("./helpers/formatCamundaUserTasks");

const { user_roles } = require("./constants");

const {
  models,
  modelsByMipm,
  model_risk,
  assignment,
  validation,
  rate_system,
  risk_scale,
  usersActiveTasks,
} = require("./headers");

class Report {
  constructor(db, bpmn, integration) {
    this.db = db;
    this.bpmn = bpmn;
    this.integration = integration;
  }

  models = async ({
    model_tmpl,
    cust_tmpl,
    model_priority_template,
    model_type_id_filter,
    company_group_id_filter,
    product_and_scope_id_filter,
    model_developing_reasons,
    model_ds_departments,
    includes_automl_models,
    includes_archive_models,
  }) => {
    // Models list with filters
    const modelsList = await this.db
      .execute({
        sql: sql.modelsList,
        args: {
          model_tmpl,
          includes_automl_models,
          includes_archive_models,
          cust_tmpl: cust_tmpl.length > 0 ? cust_tmpl.join(",") : null,
          model_priority_template:
            model_priority_template.length > 0
              ? model_priority_template.join(",")
              : null,
          model_type_id_filter:
            model_type_id_filter.length > 0
              ? model_type_id_filter.join(",")
              : null,
          company_group_id_filter:
            company_group_id_filter.length > 0
              ? company_group_id_filter.join(",")
              : null,
          product_and_scope_id_filter:
            product_and_scope_id_filter.length > 0
              ? product_and_scope_id_filter.join(",")
              : null,
          model_ds_departments:
            model_ds_departments.length > 0
              ? model_ds_departments.join(",")
              : null,
          model_developing_reasons:
            model_developing_reasons.length > 0
              ? model_developing_reasons.join(",")
              : null,
        },
      })
      .then(formatModelsResult);

    // Models business departments by bpmn stages
    const businessDepartmentsByStages = await this.db
      .execute({
        sql: sql.modelsCountByStagesAndDepartments,
        args: {
          artefactId: 6,
        },
      })
      .then(formatModelsDepartmentsResult);

    // Models development (DS) departments by bpmn stages
    const developmnetDepartmentsByStages = await this.db
      .execute({
        sql: sql.modelsCountByStagesAndDepartments,
        args: {
          artefactId: 7,
        },
      })
      .then(formatModelsDepartmentsResult)
      .then(mappingDevDepartmentsToStreams);

    return {
      pagesHeaders: models,
      pagesData: [
        modelsList,
        businessDepartmentsByStages,
        developmnetDepartmentsByStages,
      ],
    };
  };

  modelsByMipm = ({ all, list }) => {
    return this.db
      .execute({
        sql: sql.mipm,
        args: {
          bc_department_list: list.join(","),
          all_bc_department_flg: all ? "1" : "0",
        },
      })
      .then((data) => data.rows)
      .then((data) => ({
        pagesHeaders: modelsByMipm,
        pagesData: [data],
      }));
  };

  validation = ({
                  rep_date_from,
                  rep_date_to,
                  status_filter,
                  product_and_scope_id_filter,
                  model_type_id_filter,
                  val_type_filter,
                  val_results_filter,
                }) => {
    return this.db
      .execute({
        sql: sql.validation,
        args: {
          rep_date_from,
          rep_date_to,
          status_filter:
            status_filter.length > 0 ? status_filter.join(",") : null,
          product_and_scope_id_filter:
            product_and_scope_id_filter.length > 0
              ? product_and_scope_id_filter.join(",")
              : null,
          model_type_id_filter:
            model_type_id_filter.length > 0
              ? model_type_id_filter.join(",")
              : null,
          val_type_filter:
            val_type_filter.length > 0 ? val_type_filter.join(",") : null,
          val_results_filter:
            val_results_filter.length > 0 ? val_results_filter.join(",") : null,
        },
      })
      .then((data) => data.rows)
      .then((data) => ({
        pagesHeaders: validation,
        pagesData: [data],
      }));
  };

  rate_system = ({
                   model_int_date_from,
                   model_int_date_to,
                   model_removal_date_from,
                   model_removal_date_to,
                   model_update_date_from,
                   model_update_date_to,
                   model_tmpl,
                   cust_tmpl,
                   model_priority_template,
                   model_type_id_filter,
                   spicific_date_unloading,
                   only_prod_models,
                   company_group_id_filter,
                   product_and_scope_id_filter,
                   model_ds_departments,
                   model_developing_reasons,
                   includes_automl_models,
                 }) =>
    this.db
      .execute({
        sql: sql.rate,
        args: {
          spicific_date_unloading,
          model_int_date_from,
          model_int_date_to,
          model_removal_date_from,
          model_removal_date_to,
          model_update_date_from,
          model_update_date_to,
          includes_automl_models,
          model_tmpl: model_tmpl ?? "",
          only_prod_models,
          cust_tmpl: cust_tmpl.length > 0 ? cust_tmpl.join(",") : "",
          model_priority_template:
            model_priority_template.length > 0
              ? model_priority_template.join(",")
              : "",
          model_type_id_filter:
            model_type_id_filter.length > 0
              ? model_type_id_filter.join(",")
              : "",
          company_group_id_filter:
            company_group_id_filter.length > 0
              ? company_group_id_filter.join(",")
              : "",
          product_and_scope_id_filter:
            product_and_scope_id_filter.length > 0
              ? product_and_scope_id_filter.join(",")
              : "",
          model_ds_departments:
            model_ds_departments.length > 0
              ? model_ds_departments.join(",")
              : "",
          model_developing_reasons:
            model_developing_reasons.length > 0
              ? model_developing_reasons.join(",")
              : "",
        },
      })
      .then(({ rows }) => ({
        pagesHeaders: rate_system,
        pagesData: [rows],
      }));

  risk_scale = ({ scale_start_date_from, scale_end_date_to, slice }) => {
    return this.db
      .execute({
        sql: sql.risk_scale,
        args: {
          scale_start_date_from: scale_start_date_from.trim().length ? scale_start_date_from : null,
          scale_end_date_to: scale_end_date_to.trim().length ? scale_end_date_to : null,
          slice: slice.trim().length ? slice : null,
        },
      })
      .then((data) => data.rows)
      .then((data) => ({
        pagesHeaders: risk_scale,
        pagesData: [data],
      }));
  };

  assignment = ({
                  assignment_date_fltr_from,
                  assignment_date_fltr_to,
                  assignment_protocol_details,
                  assignment_uo_name,
                  assignment_uo_question,
                  assignment_department,
                  assignment_contractor,
                  status,
                  assignment_model_risk,
                  assignment_risk_type,
                  model,
                  initial_end_date_fltr_from,
                  initial_end_date_fltr_to,
                  actual_end_date_fltr_from,
                  actual_end_date_fltr_to,
                }) => {
    return this.db
      .execute({
        sql: sql.assignment,
        args: {
          assignment_date_fltr_from,
          assignment_date_fltr_to,
          assignment_protocol_details:
            assignment_protocol_details.length > 0
              ? assignment_protocol_details.join(",")
              : null,
          assignment_uo_name:
            assignment_uo_name.length > 0 ? assignment_uo_name.join(",") : null,
          assignment_uo_question:
            assignment_uo_question.length > 0
              ? assignment_uo_question.join(",")
              : null,
          assignment_department:
            assignment_department.length > 0
              ? assignment_department.join(",")
              : null,
          assignment_contractor:
            assignment_contractor.length > 0
              ? assignment_contractor.join(",")
              : null,
          status: status.length > 0 ? status.join(",") : null,
          assignment_model_risk:
            assignment_model_risk.length > 0
              ? assignment_model_risk.join(",")
              : null,
          assignment_risk_type:
            assignment_risk_type.length > 0
              ? assignment_risk_type.join(",")
              : null,
          model: model.length > 0 ? model.join(",") : null,
          initial_end_date_fltr_from,
          initial_end_date_fltr_to,
          actual_end_date_fltr_from,
          actual_end_date_fltr_to,
        },
      })
      .then((data) => data.rows)
      .then((data) => ({
        pagesHeaders: assignment,
        pagesData: [data],
      }));
  };

  model_risk = ({
                  mr_sign_ek_filter,
                  model_segment_valid_template,
                  mr_rate_segment_from,
                  VALIDATION_RESULT_filter,
                  mr_ratio_k_final_obsolescence_to,
                  date_KUORR_to,
                  company_group_id_filter,
                  SIGN_ADJACENCY_filter,
                  model_type_id_filter,
                  root_model_id_filter,
                  mr_ratio_k_final_obsolescence_from,
                  model_tmpl,
                  slice,
                  status_filter,
                  date_KUORR_from,
                  mr_rate_segment_to,
                }) => {
    return this.db
      .execute({
        sql: sql.model_risk,
        args: {
          mr_sign_ek_filter:
            mr_sign_ek_filter.length > 0 ? mr_sign_ek_filter.join(",") : null,
          model_segment_valid_template,
          mr_rate_segment_from,
          VALIDATION_RESULT_filter:
            VALIDATION_RESULT_filter.length > 0
              ? VALIDATION_RESULT_filter.join(",")
              : null,
          mr_ratio_k_final_obsolescence_to,
          date_KUORR_to,
          company_group_id_filter:
            company_group_id_filter.length > 0
              ? company_group_id_filter.join(",")
              : null,
          SIGN_ADJACENCY_filter:
            SIGN_ADJACENCY_filter.length > 0
              ? SIGN_ADJACENCY_filter.join(",")
              : null,
          model_type_id_filter:
            model_type_id_filter.length > 0
              ? model_type_id_filter.join(",")
              : null,
          root_model_id_filter:
            root_model_id_filter.length > 0
              ? root_model_id_filter.join(",")
              : null,
          mr_ratio_k_final_obsolescence_from,
          model_tmpl,
          slice: moment(slice).add(1, "days").format("YYYY-MM-DD"),
          status_filter:
            status_filter.length > 0 ? status_filter.join(",") : null,
          date_KUORR_from,
          mr_rate_segment_to,
        },
      })
      .then((data) => data.rows)
      .then((data) => ({
        pagesHeaders: model_risk,
        pagesData: [data],
      }));
  };

  usersActiveTasks = async ({ days_of_delay }) => {
    const userTasksPromises = user_roles.map((userRole) => this.bpmn.tasks([userRole]))
    const userTasks = formatUserTasks(await Promise.all(userTasksPromises))
    const taskMap = new Map(userTasks.map(task => [task.processInstanceId + task.role, task]))

    const bpmnInstances = (
      await this.db.execute({
        sql: sql.instancesByIds,
        args: {
          bpmnIds: userTasks.map(({ processInstanceId }) => processInstanceId)
        }
      })
    )?.rows

    const instanceMap = new Map(bpmnInstances.map(instance => [instance.MODEL_ID, instance]))

    const assigneeHist = (
      await this.db.execute({
        sql: sql.assigneeHistByModelIds,
        args: {
          modelIds: Array.from(instanceMap.keys()),
          dateOfDelay: moment().subtract(days_of_delay * 1, 'days').format('YYYY-MM-DD HH:MM:ss')
        }
      })
    )?.rows

    const allGroups = await this.integration.keycloak.getSubGroupsByGroupsName(['departament', 'departament_business_customer'])
    const getUsersInGroups = (groups) => {
      const userGroupsMap = {}
      const getUsersInGroup = async (groupId, groupName) => {
        const users = await this.integration.keycloak.getUsersInGroup(groupId)
        users.forEach(user => {
          const username = user.username
          if (!userGroupsMap[username]) {
            userGroupsMap[username] = []
          }
          userGroupsMap[username].push(groupName)
        })
      }
      const groupPromises = groups.map(group => {
        const groupId = group.id
        const groupName = group.name
        return getUsersInGroup(groupId, groupName)
      })
      return Promise.all(groupPromises)
        .then(() => userGroupsMap)
    }
    const users = await getUsersInGroups(allGroups)

    const assigneeHistWithTasks = assigneeHist.reduce((acc, assigneeHistItem) => {
      const instance = instanceMap.get(assigneeHistItem.MODEL_ID)
      if (!instance) return acc

      const taskKey = instance.BPMN_INSTANCE_ID + assigneeHistItem.FUNCTIONAL_ROLE
      const task = taskMap.get(taskKey)
      if (!task || task.role !== assigneeHistItem.FUNCTIONAL_ROLE) return acc

      const streams = new Set()
      assigneeHist.ASSIGNEE_NAME
        .split(', ')
        .map((username) => {
          if (username in users) {
            users[username].map(stream => streams.add(stream))
          }
        })

      acc.push({
        MODEL_ID: assigneeHistItem.MODEL_ID,
        MODEL_NAME: assigneeHistItem.MODEL_NAME,
        MODEL_ALIAS: `model${ assigneeHistItem.ROOT_MODEL_ID }-v${ assigneeHistItem.MODEL_VERSION }`,
        UPDATE_DATE: assigneeHistItem.UPDATE_DATE,
        STATUS: assigneeHistItem.STATUS,
        TASK_NAME: task.name,
        ROLE: task.role,
        USER_NAME: assigneeHistItem.ASSIGNEE_NAME,
        STREAMS: Array.from(streams).join(', ')
      })

      return acc
    }, [])

    return {
      pagesHeaders: usersActiveTasks,
      pagesData: [assigneeHistWithTasks]
    }
  };
}

module.exports = Report;
