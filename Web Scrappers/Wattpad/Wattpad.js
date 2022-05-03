const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const createEpub = require('../../Utils/createEpub');
const createHTML = require('../../Utils/createHTML');
const getDate = require('../../Utils/getDate');
const autoScroll = require('../../Utils/autoScroll');
const createBookCover = require('../../Utils/createBookCover');
const sendDataToCloud = require('../../Utils/sendDataToCloud');
const SendEmail = require('../../Utils/SendEmail');
const { default: axios } = require('axios');
const random_ua = require('random-ua');
const Wattpad = async (
	extension,
	id,
	socket,
	cloudinary,
	db,
	forceUpdate,
	user,
) => {
	let book = {};
	let isBookUpdated = false;
	const browser = await puppeteer.launch();
	const incognitoContext = await browser.createIncognitoBrowserContext();
	const page = await incognitoContext.newPage();
	await page.setUserAgent(random_ua.generate());
	await page.goto(`https://wattpad.com/story/${id}`);
	const is404 = await page.$('#story-404-wrapper');
	if (is404) {
		socket.emit('error', {
			message: 'Story not found',
		});
		await browser.close();
		return;
	}
	const storyLastUpdated = await page
		.$eval('.table-of-contents__last-updated strong', (ele) => ele.textContent)
		.then((data) => getDate(data));

	const [result] = await db.query(
		` SELECT * FROM all_books WHERE id ='W-${id}'`,
	);

	if (result.length > 0 && !forceUpdate) {
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
		socket.emit('log', {
			message: `Fetching ${id}`,
		});
		if (moment(info.updated).isSame(storyLastUpdated)) {
			socket.emit('log', {
				message: `Book is up to date`,
			});
		} else {
			socket.emit('log', {
				message: `Book is not up to date`,
			});
			socket.emit('log', {
				message: `Refreshing book`,
			});
			isBookUpdated = true;
		}
	}
	if (result.length === 0 || forceUpdate || isBookUpdated) {
		const bookInfo = {};
		let chapters = [];
		let error = true;
		let errorCount = 0;
		let errorMessage = '';
		//- 1. Lauching browser
		let chaptersInfo;

		const fetchBookInfo = async () => {
			const page = await incognitoContext.newPage({
				waitUntil: 'networkidle2',
			});
			page.setUserAgent(random_ua.generate());
			//- 2. Navigating to Wattpad
			await page.goto(`https://www.wattpad.com/story/${id}`);
			await page.waitForSelector('.story-parts a');
			const isStoryPaid = await page.$('.paid-indicator');
			if (isStoryPaid) {
				socket.emit('error', {
					message: 'This story is paid',
					type: 'single',
				});
				return;
			}
			//- 3. Getting the book info
			chaptersInfo = await page.$$eval('.story-parts a', (ele) => {
				return ele.map((el) => [el.href, el.innerText]);
			});

			bookInfo.title = await page.$eval(
				'.story-info__title',
				(ele) => ele.textContent,
			);
			socket.emit('log', {
				message: `Fetching <b>${bookInfo.title}</b>`,
			});
			socket.emit('log', {
				message: `Fetching Book Info`,
			});
			[bookInfo.author, bookInfo.authorUrl] = await page.$eval(
				'.author-info__username a',
				(ele) => {
					return [ele.innerText, ele.href];
				},
			);
			bookInfo.description = await page.$eval(
				'.description-text',
				(ele) => ele.textContent,
			);
			bookInfo.status = await page.$eval(
				'.story-badges .tag-item',
				(ele) => ele.textContent,
			);
			bookInfo.published = await page
				.$eval('.story-badges .sr-only', (ele) =>
					ele.innerText.split('published ')[1].trim(),
				)
				.then((data) => getDate(data));

			bookInfo.updated = await page
				.$eval(
					'.table-of-contents__last-updated strong',
					(ele) => ele.textContent,
				)
				.then((data) => getDate(data));
			bookInfo.chapters = chaptersInfo.length;
			bookInfo.uid = `W-${id}`;
			bookInfo.url = `https://www.wattpad.com/story/${id}`;
			bookInfo.id = id;

			socket.emit('log', {
				message: `Fetching Chapter 1`,
			});
			await page.close();
		};
		while (error && errorCount < 3) {
			try {
				await fetchBookInfo();
				error = false;
				errorCount = 0;
			} catch (error) {
				socket.emit('log', {
					message: `Failed to fetch book info`,
				});
				socket.emit('log', {
					message: `Retrying...`,
				});
				console.log(error);
				errorCount++;
			}
		}
		if (errorCount >= 3) {
			socket.emit('error', {
				message: `Failed to fetch book info`,
			});
			if (user) {
				SendEmail(user.email, 'Failed to fetch book info', {
					err: {
						message: JSON.stringify(errorMessage),
						time: moment().format('MMMM Do YYYY, h:mm:ss a'),
						site: 'Wattpad',
					},
					user,
					book: `${book.title} by ${book.author}`,
				});
			}
			return {
				error: true,
			};
		}
		error = true;
		//- 4. Creating the book Cover
		socket.emit('log', {
			message: `Creating Book Cover`,
		});
		bookInfo.cover = await createBookCover(bookInfo, cloudinary);
		socket.emit('bookinfo', { ...bookInfo, extension });

		//- 5. Getting the chapters
		for (chapter of chaptersInfo) {
			error = true;
			errorCount = 0;
			const fetchChapter = async (chapter) => {
				console.log(chapter[1]);
				socket.emit('log', {
					message: `Fetching <b>${chaptersInfo.indexOf(chapter) + 1} / ${
						chaptersInfo.length
					}</b>`,
				});

				//* 4.1. Launching new page
				const newPage = await incognitoContext.newPage({
					waitUntil: 'networkidle2',
				});
				newPage.setUserAgent(random_ua.generate());
				//* 4.2. Navigating to chapter
				await newPage.goto(chapter[0]);
				await newPage.waitForSelector(`[data-page-number="1"]`);

				//* 4.3. Scrolling to the bottom
				await autoScroll(newPage);
				const pages = [];
				const pageURL = await newPage.evaluate(() => location.href);
				const pageURLArr = pageURL.split('/');
				const totalPages = Number(pageURLArr[pageURLArr.length - 1]) || 1;
				let currentPage = 0;

				//* 4.4. Getting the pages
				while (currentPage <= totalPages) {
					const pageText = await newPage.$$eval(
						`[data-page-number="${currentPage}"] p`,
						(ele, currentPage) => {
							return ele.map((el) => {
								const markers = [
									...document.querySelectorAll(
										`[data-page-number="${currentPage}"] p .comment-marker`,
									),
								];

								if (markers.length > 0) {
									el.removeChild(markers[0]);
								}
								return el.innerHTML;
							});
						},
						currentPage,
					);
					pages.push(pageText.join(''));
					currentPage++;
				}

				//* 4.5 Pushing the chapter to the book
				chapters.push({
					title: chapter[1],
					data: pages.join(''),
					url: chapter[0],
				});
				socket.emit('log', {
					message: `Fetched ${chaptersInfo.indexOf(chapter) + 1} / ${
						chaptersInfo.length
					}`,
				});

				//* 4.6 Closing the page
				await newPage.close();
			};

			while (error && errorCount < 10) {
				try {
					await fetchChapter(chapter);
					error = false;
				} catch (e) {
					error = true;
					console.log(e);
					socket.emit('log', {
						message: `Error fetching chapter ${
							chaptersInfo.indexOf(chapter) + 1
						}`,
					});
					socket.emit('log', {
						message: `Retrying...`,
					});
					errorCount++;
				}
			}
		}

		//- 6. Closing the browser
		await browser.close();

		//- 7. Uploading the book to cloudinary & database
		socket.emit('log', {
			message: `Saving Book to Database`,
		});
		const dataUrl = await sendDataToCloud(bookInfo, chapters, cloudinary);
		if (forceUpdate) {
			await db.query(`
				UPDATE fanfic2book.all_books
				SET updated=CURRENT_TIMESTAMP
				WHERE id='W-${id}';
	`);
		} else {
			await db.query(`INSERT INTO fanfic2book.all_books
				(updated, info, id)
				VALUES(CURRENT_TIMESTAMP, '${dataUrl}', 'W-${id}');`);
		}
		book = { ...bookInfo, book: chapters };
	}
	//- 8. Creating the book and returning the buffer and book info
	socket.emit('log', {
		message: `Creating Book`,
	});
	if (extension === 'epub') {
		const buffer = await createEpub(book, socket, cloudinary);
		return { bookInfo: book, buffer };
	} else if (extension === 'html') {
		const buffer = await createHTML(book);
		return { bookInfo: book, buffer };
	}
};
module.exports = Wattpad;
