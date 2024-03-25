const emailAdmin= process.env.SMTP_USER
const connector = require('./connector')
const tmp = require('./templates')

class Smtp {

    getMsgBody = (template_name, args) => {
        const template = tmp[template_name].msg_body(args)
        return Buffer.from(template).toString('utf-8')
    }

    getMsgSubject = (template_name, model_alias) => {
        const subject = tmp[template_name].msg_subject(model_alias)
        return Buffer.from(subject).toString('utf-8')
    }

    email = ({ 
        to, 
        subject, 
        text_content
    }) => {
        console.info('SEND EMAIL:', to, subject, text_content)
        const body = JSON.stringify({
            email_from: emailAdmin,
            email_to: to,
            subject: Buffer.from(subject).toString('utf-8'),
            text_content: Buffer.from(text_content).toString('utf-8')
        })
        return connector({ 
            path: 'notification/send-email', 
            body 
        })
    }
}

module.exports = Smtp
