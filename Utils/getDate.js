const moment = require('moment');
module.exports = (date) => {
	date = date.toLowerCase().trim();
	const dateFormat = 'YYYY-MM-DD';
	console.log(date);
	if (date.includes('today')) {
		return moment().format(dateFormat);
	}
	if (date.includes('a day ago')) {
		return moment().subtract(1, 'days').format(dateFormat);
	}
	if (date.includes('days ago')) {
		const days = Number(date.match(/\d+/g)[0]);
		return moment().subtract(days, 'days').format(dateFormat);
	}
	if (date.includes('hours ago')) {
		const hours = Number(date.match(/\d+/g)[0]);
		return moment().subtract(hours, 'hours').format(dateFormat);
	}
	return moment(date).format('YYYY-MM-DD');
};
