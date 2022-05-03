import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
export const templates = {
	newUser: 'd-a48b00c1e9184365abec57fe4cf211f7',
	bookCreated: 'd-3bdc25b225834025b80a9c3a20ab08dd',
	userError: 'd-4b6c9c21fec24011830354d98e197b6d',
};
export const SendEmail = (
	email: string,
	template: string,
	templateData: any,
	attachments: any = [],
) => {
	const msg = {
		to: email, // Change to your recipient
		from: 'heetkv@gmail.com', // Change to your verified sender
		templateId: template,
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
