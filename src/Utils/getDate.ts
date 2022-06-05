const moment = require('moment');
/**
 *
 * @param {string} date
 * @returns {string} dateFormat ( default : 'YYYY-MM-DD')
 * @returns {string} date
 *
 */
export const getDate = (date: string, dateFormat: string = 'YYYY-MM-DD') => {
	console.log(date);
	date = date.toLowerCase().trim();
	if (date.includes('today')) {
		console.log('today');
		return moment().format(dateFormat);
	}
	if (date.includes('a day ago')) {
		console.log('a day ago');
		return moment().subtract(1, 'days').format(dateFormat);
	}
	if (date.includes('days ago')) {
		console.log('days ago');
		const days = Number((date.match(/\d+/g) as string[])[0]);
		return moment().subtract(days, 'days').format(dateFormat);
	}
	if (date.includes('hours ago')) {
		console.log('hours ago');
		const hours = Number((date.match(/\d+/g) as string[])[0]);
		return moment().subtract(hours, 'hours').format(dateFormat);
	}
	if (/\d{4}-\d{1,2}-\d{1,2}/.test(date)) {
		console.log(date, 'YYYY-MM-DD');
		return moment(date, 'YYYY-MM-DD').format(dateFormat);
	}
	if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(date)) {
		console.log(date, 'MM/DD/YYYY');
		return moment(date, 'DD/MM/YYYY').format(dateFormat);
	}
	if (/\d{1,2}-\d{1,2}-\d{4}/.test(date)) {
		console.log(date, 'MM-DD-YYYY');
		return moment(date, 'DD-MM-YYYY').format(dateFormat);
	}
	console.log(date, 'none');
	return moment(date, 'MMM DD, YYYY').format(dateFormat);
};
