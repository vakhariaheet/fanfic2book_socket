const sgMail = require('@sendgrid/mail');
require('dotenv').config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const templates = {
	newUser: 'd-a48b00c1e9184365abec57fe4cf211f7',
	bookCreated: 'd-3bdc25b225834025b80a9c3a20ab08dd',
};
module.exports = (email, template, templateData, attachments) => {
	const msg = {
		to: email, // Change to your recipient
		from: 'heetkv@gmail.com', // Change to your verified sender
		templateId: templates[template],
		dynamic_template_data: templateData,
		attachments,
	};
	sgMail
		.send(msg)
		.then(() => {
			console.log('Email sent');
		})
		.catch((error) => {
			console.error(error);
		});
};
