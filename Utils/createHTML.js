const fs = require('fs');
const bookToHTML = require('./bookToHTML');

module.exports = async (bookInfoData, book, socket) => {
	return socket.emit('success', {
		html: await bookToHTML({ ...bookInfoData, book }),
		...bookInfoData,
		extension: 'html',
	});
};
