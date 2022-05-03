const { default: axios } = require('axios');
const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const createBookCover = require('../../Utils/createBookCover');
const createEpub = require('../../Utils/createEpub');
const createHTML = require('../../Utils/createHTML');
const { getDate } = require('../../Utils/getDate');
const sendDataToCloud = require('../../Utils/sendDataToCloud');
module.exports = async (
	bookid,
	extension,
	socket,
	cloudinary,
	db,
	forceUpdate,
) => {
	//- Check if book is already in database
	let book;
	socket.emit('log', {
		message: 'Checking if the book is already in the database',
		type: 'single',
	});

	const [result] = await db.query(
		` SELECT * FROM all_books WHERE id ='F-${bookid}'`,
	);

	if (result.length > 0 && !forceUpdate) {
		//- Book is already in database and forceUpdate is false
		socket.emit('log', {
			message: 'Book found in database',
			type: 'single',
		});

		const resp = await axios({
			method: 'GET',
			url: result[0].info,
		});
		const info = { ...resp.data, extension };
		book = { ...resp.data, extension };
		socket.emit('bookinfo', info);
	} else {
		if (!forceUpdate) {
			//* Book is not in database
			socket.emit('log', {
				message: 'Book not found in database',
			});
		}
		socket.emit('log', {
			message: 'Fetching book',
		});
		let error = true;
		let errorCount = 0;

		//-- 1. Lauching browser and navigating to FanFiction.net Story
		const browser = await puppeteer.launch({ headless: false });
		const incognitoContext = await browser.createIncognitoBrowserContext();
		const page = await incognitoContext.newPage();
		const bookInfo = {};
		const fetchBookInfo = async () => {
			await page.goto(`https://www.fanfiction.net/s/${bookid}`);
			//** Wait for the Cloudflare few seconds loading screen to disappear
			await page.waitForSelector('#storytext');

			//-- 2. Getting the book info
			const bookInfoEle = await page.$('#profile_top');

			bookInfo.title = await bookInfoEle.$eval(
				'b.xcontrast_txt',
				(ele) => ele.innerHTML,
			);

			bookInfo.author = await bookInfoEle.$eval(
				'a.xcontrast_txt',
				(ele) => ele.innerHTML,
			);
			socket.emit('log', {
				message: `Fetching book info for ${bookInfo.title} by ${bookInfo.author}`,
			});
			bookInfo.authorUrl = await bookInfoEle.$eval(
				'a.xcontrast_txt',
				(ele) => ele.href,
			);
			bookInfo.description = await bookInfoEle.$eval(
				'div.xcontrast_txt',
				(ele) => ele.innerHTML,
			);
			const otherInfo = await page.$eval('span.xgray.xcontrast_txt', (ele) =>
				ele.textContent.split('-').map((el) => el.trim()),
			);
			bookInfo.url = `https://www.fanfiction.net/s/${bookid}`;
			bookInfo.rating = otherInfo[0]
				.split('Rated: ')
				.filter((v) => v)[0]
				.trim();
			otherInfo.shift();
			[bookInfo.language, bookInfo.genre, bookInfo.fandom] = otherInfo;
			bookInfo.chapters = 1;
			otherInfo.map((val) => {
				if (val.includes('Chapters')) {
					bookInfo.chapters = val
						.split('Chapters: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
				if (val.includes('Words')) {
					bookInfo.words = val
						.split('Words: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
				if (val.includes('Updated')) {
					bookInfo.updated = getDate(
						val
							.split('Updated: ')
							.filter((v) => v.trim() && v)[0]
							.trim(),
					);
				}
				if (val.includes('Published')) {
					bookInfo.published = getDate(
						val
							.split('Published: ')
							.filter((v) => v.trim() && v)[0]
							.trim(),
					);
				}
				if (val.includes('Status')) {
					bookInfo.status = val
						.split('Status: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
				}
			});
			bookInfo.id = bookid;
			bookInfo.uid = 'F-' + bookid;
			socket.emit('log', {
				message: `Book info fetched`,
			});
		};
		while (error && errorCount < 5) {
			try {
				await fetchBookInfo();
				error = false;
			} catch (error) {
				errorCount++;
				socket.emit('log', {
					message: `Error fetching book info, retrying...`,
					type: 'single',
				});
			}
		}
		//-- 3. Creating the book cover
		socket.emit('log', {
			message: `Creating book cover`,
		});
		bookInfo.cover = await createBookCover(bookInfo, cloudinary);

		socket.emit('bookinfo', { ...bookInfo, extension });

		//-- 4. Getting the book chapters
		socket.emit('log', {
			message: `Fetching chapters`,
		});
		socket.emit('log', {
			message: `Fetching chapter <b> 1 / ${bookInfo.chapters} </b>`,
		});
		const chapter1Data = await page.$eval('#storytext', (ele) => ele.innerHTML);
		let chapterName = 'Chapter 1';
		if (Number(bookInfo.chapters) > 1) {
			const chapterNameArr = await page.$eval(
				'#chap_select option[selected]',
				(ele) => ele.textContent.split(' '),
			);
			chapterNameArr.shift();
			chapterName = chapterNameArr.join('  ');
		}

		const chapters = [
			{
				title: chapterName,
				data: chapter1Data,
				url: `https://www.fanfiction.net/s/${bookid}`,
			},
		];

		socket.emit('bookInfo', { ...bookInfo, extension });

		for (let i = 2; i <= Number(bookInfo.chapters); i++) {
			error = true;
			socket.emit('log', {
				message: `Fetching chapter <b> ${i} / ${bookInfo.chapters} </b>`,
			});
			const fetchChapter = async (i) => {
				await page.goto(`https://m.fanfiction.net/s/${bookid}/${i}`);
				await page.waitForSelector('#storycontent');
				const chapterData = await page.$eval(
					'#storycontent',
					(ele) => ele.innerHTML,
				);
				const chapterName = await page.$eval('#content', (ele) => {
					const infoArr = ele.textContent.split('\n').filter((v) => v.trim());
					return infoArr[infoArr.length - 1];
				});
				chapters.push({
					title: chapterName,
					data: chapterData,
					url: `https://www.fanfiction.net/s/${bookid}/${i}`,
				});
			};
			while (error && errorCount < 5) {
				try {
					await fetchChapter(i);
					error = false;
				} catch (e) {
					error = true;
					console.log(e);
					socket.emit('log', {
						message: `Error fetching chapter ${i}`,
					});
					socket.emit('log', {
						message: `Retrying...`,
					});
					errorCount++;
				}
			}
		}
		await browser.close();

		//-- 5. Sending the book to the cloud storage and saving the book info in the database
		socket.emit('log', {
			message: `Saving book to database`,
		});
		const dataUrl = await sendDataToCloud(bookInfo, chapters, cloudinary);
		if (forceUpdate) {
			await db.query(`
		UPDATE fanfic2book.all_books
		SET updated=CURRENT_TIMESTAMP
		WHERE id='F-${bookid}';
`);
		} else {
			await db.query(`INSERT INTO fanfic2book.all_books
		(updated, info, id)
		VALUES(CURRENT_TIMESTAMP, '${dataUrl}', 'F-${bookid}');`);
		}
		book = { ...bookInfo, book: chapters };
	}

	//- Creating file and sending buffer to the frontend
	if (extension === 'epub') {
		socket.emit('log', {
			message: `Creating epub file`,
		});
		const buffer = await createEpub(book, socket, cloudinary);
		socket.emit('log', {
			message: `Book File Created`,
		});
		return { bookInfo: book, buffer };
	} else if (extension === 'html') {
		socket.emit('log', {
			message: `Creating epub file`,
		});
		const { buffer, size } = await createHTML(book);
		socket.emit('log', {
			message: `Book File Created`,
		});
		return { bookInfo: book, buffer, size };
	}
};
