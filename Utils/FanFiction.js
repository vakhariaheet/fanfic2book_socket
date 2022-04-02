const Nightmare = require('nightmare');
const fs = require('fs');
const createBookCover = require('./createBookCover');
const createEpub = require('./createEpub');
const createHTML = require('./createHTML');
const sendDataToCloud = require('./sendDataToCloud');

const getFanFictionBookid = async (url) => {
	url.replace('https://', '');
	url.replace('http://', '');
	return url.split('/')[4];
};

module.exports = async (url, extension, socket, cloudinary) => {
	const bookid = await getFanFictionBookid(url);
	socket.emit('log', {
		message: `Getting book ${bookid}`,
	});
	socket.emit('log', {
		message: 'Fetching book data and Chapter 1',
	});
	const { chapter1, bookData } = await Nightmare()
		.goto(`https://fanfiction.net/s/${bookid}`)
		.wait('#storytext')
		.evaluate(() => {
			const chapter1 = document.querySelector('#storytext').innerHTML;
			let bookInfo = document.querySelector('#profile_top');
			const bookData = {};

			bookData.title = bookInfo.querySelector('b.xcontrast_txt').innerHTML;
			bookData.author = bookInfo.querySelector('a.xcontrast_txt').innerHTML;

			bookData.description =
				bookInfo.querySelector('div.xcontrast_txt').innerHTML;
			const otherInfo = document
				.querySelector('span.xgray.xcontrast_txt')
				.textContent.split('-')
				.map((v) => v.trim());
			bookData.rated = otherInfo[0]
				.split('Rated: ')
				.filter((v) => v)[0]
				.trim();
			otherInfo.shift();
			[bookData.language, bookData.genre, bookData.type] = otherInfo;

			otherInfo.map((val) => {
				if (val.includes('Chapters')) {
					bookData.chapters = val
						.split('Chapters: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
				if (val.includes('Words')) {
					bookData.words = val
						.split('Words: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
				if (val.includes('Updated')) {
					bookData.updated = val
						.split('Updated: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
				if (val.includes('Published')) {
					bookData.published = val
						.split('Published: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
				if (val.includes('Status')) {
					bookData.status = val
						.split('Status: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
			});
			let chapterName = 'Chapter 1';
			if (Number(bookData.chapters) > 1) {
				const chapterNameArr = document
					.querySelector('#chap_select option[selected]')
					.textContent.split(' ');
				chapterNameArr.shift();

				chapterName = chapterNameArr.join('  ');
			}
			return {
				chapter1: {
					title: chapterName,
					data: chapter1,
				},
				bookData,
			};
		})
		.end();
	bookData.id = bookid;
	bookData.uid = `F-${bookid}`;
	socket.emit('log', {
		message: `Fetched <b>${bookData.title} by ${bookData.author}</b> and Chapter 1`,
	});
	socket.emit('log', {
		message: `Total Chapters: <b>${bookData.chapters}</b>`,
	});
	socket.emit('log', {
		message: 'Creating book cover',
	});
	const datauri = await createBookCover(bookData);
	socket.emit('log', {
		message: 'Created book cover',
	});
	socket.emit('log', {
		message: 'Uploading book cover to cloudinary',
	});
	const uploadResult = await cloudinary.uploader.upload(datauri, {
		folder: 'covers',
		public_id: bookData.uid,
	});
	bookData.cover = uploadResult.url;
	socket.emit('bookinfo', bookData);
	socket.emit('log', {
		message: 'Uploaded book cover to cloudinary',
	});
	const book = [chapter1];

	for (let i = 2; i <= bookData.chapters; i++) {
		socket.emit('log', {
			message: `Fetching Chapter ${i}`,
		});
		const chapter = await Nightmare()
			.goto(`https://m.fanfiction.net/s/${bookid}/${i}`)
			.wait('#storycontent')
			.evaluate(() => {
				const chapter = document.querySelector('#storycontent').innerHTML;

				// document.querySelectorAll('[role = main] ~ div a ')[1].click();
				const bookInfo = document
					.querySelector('#content')
					.textContent.split('\n')
					.filter((v) => v && v.trim())
					.map((v) => v.trim());
				return {
					title: bookInfo[bookInfo.length - 1],
					data: chapter,
				};
			})
			.end();
		book.push(chapter);
		socket.emit('log', {
			message: `Fetched Chapter ${i}`,
		});
	}
	socket.emit('log', {
		message: 'Fetched all chapters',
	});
	socket.emit('log', {
		message: 'Saving book to database',
	});
	await sendDataToCloud(bookData, book, cloudinary);
	socket.emit('log', {
		message: 'Saved book to database',
	});

	if (extension === 'epub') {
		socket.emit('log', {
			message: 'Creating epub',
		});

		const data = await createEpub(bookData, book, socket, cloudinary);
	}
	if (extension === 'html') {
		socket.emit('log', {
			message: 'Creating html',
		});

		return createHTML(bookData, book, socket);
	}
};
