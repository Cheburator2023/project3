const INTERFACE_URL = process.env.INTERFACE_URL || "http://localhost:9001/";
const tslgLogger = require('../../../utils/logger');

class Mail {
  constructor(db, integration) {
    this.db = db;
    this.integration = integration;
  }

    static consoleDebug(...args) {
        const consoleToUse = console.original?.log || console.log;
        consoleToUse('[DEBUG}', ...args);
    }

  main = async ({ task, taskService }) => {
    const variables = task.variables.getAll();
    const template_name = variables.template_name;

    tslgLogger.info(`Отправка уведомления: ${template_name}`, 'ОтправкаУведомления', {
      templateName: template_name,
      modelId: variables.model,
      taskId: task.id
    });

    try {
      //get model id
      const model = variables.model;
      const model_entity = await this.db.integration
          .modelGet(model)
          .then((d) => d.rows[0]);

      const model_alias = `model${model_entity.ROOT_MODEL_ID}-v${model_entity.MODEL_VERSION}`;
      const model_name = model_entity.MODEL_NAME;

      tslgLogger.info(`Новое уведомление ${template_name} для ${model_alias}`, 'ПодготовкаУведомления', {
        modelId: model,
        modelAlias: model_alias,
        templateName: template_name
      });

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

      const users = await this.integration.keycloak.getUsersByGroupSystem(role_name);

      const users_mail = users
          .filter((item) => item.email && modelUsers.includes(item.username))
          .map((item) => item.email);

      tslgLogger.info(`Найдено пользователей для уведомления: ${users_mail.length}`, 'ПоискПользователей', {
        modelId: model,
        role: role_name,
        usersCount: users_mail.length
      });

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
          const removeReason = await this.db.artefact.artefactRealizationById({
            artefactId: 778,
            modelId: model,
          });

          msg_args.remove_role = variables.remove_role;
          msg_args.remove_reason = removeReason?.ARTEFACT_STRING_VALUE;
        }
          break;
        case "modelCancel":
        {
          msg_args.stage_name = variables.stage_name;
          msg_args.jira_comment = "Требуется доработка артефактов";
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
          tslgLogger.warn(`Неизвестный шаблон уведомления: ${template_name}`, 'НеизвестныйШаблон', {
            templateName: template_name
          });
      }

      const text_content = this.integration.smtp.getMsgBody(template_name, msg_args);
      const message_subject = this.integration.smtp.getMsgSubject(template_name, model_alias);

      tslgLogger.info(`Отправка сообщения: ${message_subject}`, 'ОтправкаПисьма', {
        modelId: model,
        templateName: template_name,
        recipientsCount: users_mail.length,
        subject: message_subject
      });

      await this.integration.smtp.email({
        to: users_mail,
        subject: message_subject,
        text_content: text_content,
      });

      await taskService.complete(task);

      tslgLogger.info(`Уведомление отправлено успешно: ${template_name}`, 'УспехОтправкиУведомления', {
        modelId: model,
        templateName: template_name,
        recipientsCount: users_mail.length,
        taskId: task.id
      });

    } catch (error) {
      // Временная заглушка для legacy-моделей и старых бизнес-процессов:
      // SMTP notification сервис сейчас не работает, поэтому завершаем external task,
      // чтобы mail-tasks не застревали в процессе.
      await taskService.complete(task);

      if (process.env.NODE_ENV !== 'production') {
        const debugMessage = `Ошибка отправки уведомления: ${ template_name } - ${ error.message }`;
        const debugData = {
          templateName: template_name,
          modelId: variables.model,
          taskId: task.id,
          error: error.message
        };
        Mail.consoleDebug(debugMessage, debugData);
      }
    }
  };
}

module.exports = Mail;
