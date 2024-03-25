const INTERFACE_URL = process.env.INTERFACE_URL || "http://localhost:9001/";

class Mail {
  constructor(db, integration) {
    this.db = db;
    this.integration = integration;
  }

  main = async ({ task, taskService }) => {
    try {
      const variables = task.variables.getAll();
      const template_name = variables.template_name;

      //get model id
      const model = variables.model;
      const model_entity = await this.db.integration
        .modelGet(model)
        .then((d) => d.rows[0]);
      const model_alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;
      const model_name = model_entity.MODEL_NAME;
      console.sys(`New notification ${template_name} for ${model_alias}`);

      const role_name = variables.role_name;
      const model_card_URL = `${INTERFACE_URL}model/${model_entity.ROOT_MODEL_ID}/${model_entity.MODEL_VERSION}/main`;

      const modelUsers = await this.db.user
        .card(model)
        .then((data) =>
          data
            .filter(
              (d) => d.role === role_name || d.role === `${role_name}_lead`
            )
            .map((d) => d.username)
        );

      const users = await this.integration.keycloak.getUsersByGroupSystem(
        role_name
      );

      const users_mail = users
        .filter((item) => item.email && modelUsers.includes(item.username))
        .map((item) => item.email);

      const msg_args = {
        INTERFACE_URL,
        model_alias,
        model_name,
        role_name,
        model_card_URL,
      };
      switch (template_name) {
        case "developingCancel":
          {
            msg_args.cancel_role = variables.cancel_role;
          }
          break;
        case "developingRemove":
          {
            const removeReason = await this.db.artefact.artefactRealizationById(
              {
                artefactId: 778,
                modelId: model,
              }
            );

            msg_args.remove_role = variables.remove_role;
            msg_args.remove_reason = removeReason?.ARTEFACT_STRING_VALUE;
          }
          break;
        case "modelCancel":
          {
            msg_args.stage_name = variables.stage_name;
            msg_args.jira_comment = "Требуется доработка артефактов"; //variables.jira_comment
            msg_args.step_name = variables.step_name;
          }
          break;
        case "modelCreate":
          {
            const classificators = await this.db.integration
              .modelClassificators(model)
              .then((d) => d.rows);
            const classificators_string = classificators.map(
              (item) => `${item.ARTEFACT_LABEL}: ${item.ARTEFACT_STRING_VALUE}`
            );
            msg_args.classificators = classificators_string;
            msg_args.model_description = model_entity.MODEL_DESC;
            msg_args.related_models = "";
          }
          break;
        case "processChange":
          {
            msg_args.step_name = variables.step_name;
            msg_args.stage_name = variables.stage_name;
            msg_args.next_step_name = variables.next_step_name;
            msg_args.next_stage_name = variables.next_stage_name;
          }
          break;
        case "processDecision":
          {
            msg_args.step_name = variables.step_name;
            msg_args.stage_name = variables.stage_name;
            msg_args.decision_name = variables.decision_name;
            msg_args.next_step_name = variables.next_step_name;
            msg_args.next_stage_name = variables.next_stage_name;
          }
          break;
        case "statusChange":
          {
            msg_args.step_name = variables.step_name;
            msg_args.stage_name = variables.stage_name;
            msg_args.status_name = variables.status_name;
          }
          break;
        case "validationEnd":
          {
            msg_args.step_name = variables.step_name;
            msg_args.stage_name = variables.stage_name;
            msg_args.start_validation = variables.start_validation;
            msg_args.end_validation = new Date().toUTCString();
          }
          break;
        default:
          console.sys("Error");
      }

      const text_content = this.integration.smtp.getMsgBody(
        template_name,
        msg_args
      );

      const message_subject = this.integration.smtp.getMsgSubject(
        template_name,
        model_alias
      );

      console.sys(`Send message ${JSON.stringify(message_subject)}`);
      console.sys(JSON.stringify(text_content));

      await this.integration.smtp.email({
        to: users_mail,
        subject: message_subject,
        text_content: text_content,
      });
    } catch (e) {
      console.sys(JSON.stringify(e));
    }

    await taskService.complete(task);
  };
}

module.exports = Mail;
