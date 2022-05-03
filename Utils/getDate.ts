const moment = require('moment');
/**
 *
 * @param {string} date
 * @returns {string} dateFormat ( default : 'YYYY-MM-DD')
 * @returns {string} date
 *
 */
export const getDate = (date: string, dateFormat: string = 'YYYY-MM-DD') => {
	date = date.toLowerCase().trim();
	if (date.includes('today')) {
		return moment().format(dateFormat);
	}
	if (date.includes('a day ago')) {
		return moment().subtract(1, 'days').format(dateFormat);
	}
	if (date.includes('days ago')) {
		const days = Number((date.match(/\d+/g) as string[])[0]);
		return moment().subtract(days, 'days').format(dateFormat);
	}
	if (date.includes('hours ago')) {
		const hours = Number((date.match(/\d+/g) as string[])[0]);
		return moment().subtract(hours, 'hours').format(dateFormat);
	}
	if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(date)) {
		return moment(date, 'DD/MM/YYYY').format(dateFormat);
	}
	if (/\d{1,2}-\d{1,2}-\d{4}/.test(date)) {
		return moment(date, 'DD-MM-YYYY').format(dateFormat);
	}
	return moment(date, 'MMM DD, YYYY').format(dateFormat);
};
