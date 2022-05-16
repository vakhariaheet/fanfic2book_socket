import axios from 'axios';
import moment from 'moment';
import {
	BookInfo,
	Chapter,
	ScrapperError,
	ScrapperProps,
	ScrapperSuccess,
} from '../../interfaces';
import autoScroll from '../../Utils/autoScroll';
import createBookCover from '../../Utils/createBookCover';
import createEpub from '../../Utils/createEpub';
import createHTML from '../../Utils/createHTML';
import {
	getBookDefaultState,
	getBookInfoDefaultState,
} from '../../Utils/defaultState';
import { getDate } from '../../Utils/getDate';
import sendDataToCloud from '../../Utils/sendDataToCloud';
import { SendEmail, templates } from '../../Utils/SendEmail';

const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const Wattpad = async ({
	extension,
	bookid,
	socket,
	cloudinary,
	db,
	forceUpdate,
	user,
}: ScrapperProps): Promise<ScrapperSuccess | ScrapperError> => {
	let book = getBookDefaultState('W-', bookid);
	let isBookUpdated = false;
	const browser = await puppeteer.launch();
	const incognitoContext = await browser.createIncognitoBrowserContext();
	let storyLastUpdated = '';
	const page = await incognitoContext.newPage();
	let error = true;
	let errorCount = 0;
	let errorMessage = '';
	const checkBook = async () => {
		await page.goto(`https://wattpad.com/story/${bookid}`, {
			waitUntil: 'domcontentloaded',
		});
		const is404 = await page.$('#story-404-wrapper');
		if (is404) {
			socket.emit('error', {
				message: 'Story not found',
			});
			await browser.close();
			return {
				error: true,
			};
		}
		storyLastUpdated = await page
			.$eval(
				'.table-of-contents__last-updated strong',
				(ele: any) => ele.textContent,
			)
			.then((date: string) => getDate(date));
	};
	while (error && errorCount < 3) {
		try {
			socket.emit('log', {
				message: 'Checking if story is updated',
			});
			await checkBook();
			error = false;
		} catch (err) {
			socket.emit('log', {
				message: 'Error checking if story is updated',
			});
			socket.emit('error', {
				message: 'Trying again',
			});
			errorCount++;
			errorMessage = JSON.stringify(err);
		}
	}
	if (errorCount === 3) {
		socket.emit('error', {
			message: 'Failed to check if story is updated',
		});
		if (user) {
			SendEmail('heetkv@gmail.com', {
				type: templates.userError,
				error: {
					message: JSON.stringify(errorMessage),
					time: moment().format('MMMM Do YYYY, h:mm:ss a'),
					site: 'Wattpad',
				},
				user,
				book: `Forced update: ${bookid}`,
			});
		}
		await browser.close();
		return {
			error: true,
		};
	}
	error = true;
	const [result]: any = await db.query(
		` SELECT * FROM all_books WHERE id ='W-${bookid}'`,
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
			message: `Fetching ${bookid}`,
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
		const bookInfo: BookInfo = getBookInfoDefaultState('W-', bookid);
		let chapters: Chapter[] = [];

		//- 1. Lauching browser
		let chaptersInfo: string[][] = [];

		const fetchBookInfo = async () => {
			const page = await incognitoContext.newPage({
				waitUntil: 'networkidle2',
			});
			//- 2. Navigating to Wattpad
			await page.goto(`https://www.wattpad.com/story/${bookid}`);
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
			chaptersInfo = await page.$$eval('.story-parts a', (ele: Element[]) => {
				return ele.map((el: any) => [el.href, el.innerText]);
			});

			bookInfo.title = await page.$eval(
				'.story-info__title',
				(ele: any) => ele.textContent,
			);
			socket.emit('log', {
				message: `Fetching <b>${bookInfo.title}</b>`,
			});
			socket.emit('log', {
				message: `Fetching Book Info`,
			});
			[bookInfo.author, bookInfo.authorUrl] = await page.$eval(
				'.author-info__username a',
				(ele: any) => {
					return [ele.innerText, ele.href];
				},
			);
			bookInfo.description = await page.$eval(
				'.description-text',
				(ele: any) => ele.textContent,
			);
			bookInfo.status = await page.$eval(
				'.story-badges .tag-item',
				(ele: any) => ele.textContent,
			);
			bookInfo.published = await page
				.$eval('.story-badges .sr-only', (ele: any) =>
					ele.innerText.split('published ')[1].trim(),
				)
				.then((date: string) => getDate(date));

			bookInfo.updated = await page
				.$eval(
					'.table-of-contents__last-updated strong',
					(ele: any) => ele.textContent,
				)
				.then((date: string) => getDate(date));
			bookInfo.chapterLength = chaptersInfo.length;
			bookInfo.url = `https://www.wattpad.com/story/${bookid}`;

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
				SendEmail('heetkv@gmail.com', {
					type: templates.userError,
					error: {
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
		bookInfo.cover = await createBookCover(bookInfo);
		socket.emit('bookinfo', { ...bookInfo, extension });

		//- 5. Getting the chapters
		for (let chapter of chaptersInfo) {
			error = true;
			errorCount = 0;
			const fetchChapter = async (chapter: string[]) => {
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
						(ele: any, currentPage: number) => {
							return ele.map((el: any) => {
								const markers = [
									...document.querySelectorAll(
										`[data-page-number="${currentPage}"] p .comment-marker`,
									),
								];

								if (markers.length > 0) {
									el.removeChild(markers[0]);
								}
								return `<p>${el.innerHTML}</p>`;
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
					content: pages.join(''),
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
		const dataUrl = await sendDataToCloud(
			{ ...bookInfo, chapters },
			cloudinary,
		);
		if (forceUpdate) {
			await db.query(`
				UPDATE fanfic2book.all_books
				SET updated=CURRENT_TIMESTAMP
				WHERE id='W-${bookid}';
	`);
		} else {
			await db.query(`INSERT INTO fanfic2book.all_books
				(updated, info, id)
				VALUES(CURRENT_TIMESTAMP, '${dataUrl}', 'W-${bookid}');`);
		}
		book = { ...bookInfo, chapters };
	}
	//- 8. Creating the book and returning the buffer and book info
	socket.emit('log', {
		message: `Creating Book`,
	});
	if (extension === 'epub') {
		const epub = await createEpub(book, socket, user, 'Wattpad');
		if ('error' in epub) {
			return {
				error: true,
			};
		}
		const { buffer, size } = epub;
		return { book, buffer, size };
	} else if (extension === 'html') {
		const html = await createHTML(book);
		return { book, ...html };
	}
	return {
		error: true,
	};
};
export default Wattpad;
