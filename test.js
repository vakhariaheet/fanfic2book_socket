const pdf = require('html-pdf');
const fs = require('fs');
const bookData = require('./F-12265183');
const bookToHTML = require('./Utils/bookToHTML');
const createHTML = require('./Utils/createHTML');

const html = bookToHTML(bookData, 'pdf').then((html) => {
	// pdf
	// 	.create(html, {
	// 		format: 'Letter',
	// 		orientation: 'portrait',
	// 	})
	// 	.toFile(
	// 		`${bookData.uid}.pdf`,

	// 		(err, res) => {
	// 			if (err) {
	// 				return console.log(err);
	// 			}
	// 			console.log(res);
	// 		},
	// 	);
	fs.writeFileSync(`${bookData.uid}.html`, html);
});
console.log(html);
