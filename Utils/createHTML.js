const fs = require('fs');
const bookToHTML = require('./bookToHTML');
const Blob = require('node-blob');
module.exports = async (bookInfoData, src) => {
	const html = await bookToHTML(bookInfoData, src);
	const blob = new Blob([html], { type: 'text/html' });

	return blob.buffer;
};
