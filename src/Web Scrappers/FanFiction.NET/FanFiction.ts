import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {
	BookInfo,
	ScrapperProps,
	Chapter,
	ScrapperSuccess,
	ScrapperError,
	Book,
} from '../../interfaces';
puppeteer.use(StealthPlugin());
import createBookCover from '../../Utils/createBookCover';
import createEpub from '../../Utils/createEpub';
import createHTML from '../../Utils/createHTML';
import { getDate } from '../../Utils/getDate';
import sendDataToCloud from '../../Utils/sendDataToCloud';
import { default as axios } from 'axios';
import { ElementHandle } from 'puppeteer';
import {
	getBookDefaultState,
	getBookInfoDefaultState,
} from '../../Utils/defaultState';
import { SendEmail, templates } from '../../Utils/SendEmail';
import moment from 'moment';
export default async ({
	bookid,
	extension,
	socket,
	cloudinary,
	db,
	forceUpdate,
	user,
}: ScrapperProps): Promise<ScrapperSuccess | ScrapperError> => {
	//- Check if book is already in database
	let book: Book = getBookDefaultState('F-', bookid);
	socket.emit('log', {
		message: 'Checking if the book is already in the database',
		type: 'single',
	});
	const browser = await puppeteer.launch({
		headless: false,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});
	const incognitoContext = await browser.createIncognitoBrowserContext();
	const page = await incognitoContext.newPage();
	let storyLastUpdated: string = '';
	let error = true;
	let errorCount = 0;
	let errorMessage = '';
	let isBookUpdated = false;
	const checkBook = async () => {
		await page.goto(`https://www.fanfiction.net/s/${bookid}`);
		const is404 = await page.$('div big');
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

	const [result]: any = await db.query(
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
		if (info.status)
			while (error && errorCount < 3) {
				try {
					await checkBook();
					error = false;
				} catch (e) {
					errorCount++;
					errorMessage = JSON.stringify(e);
					socket.emit('log', {
						message: 'Error checking if story is updated',
					});
				}
			}
		socket.emit('bookinfo', info);
		if (errorCount === 3) {
			socket.emit('error', {
				message: 'Failed to check if story is updated',
			});
			if (user) {
				await SendEmail('heetkv@gmail.com', {
					type: templates.userError,
					book: `F-${bookid}`,
					error: {
						message: errorMessage,
						site: 'Fanfiction',
						time: moment().format('MMMM Do YYYY, h:mm:ss a'),
					},
					user,
				});
			}
		}
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
	} else if (result.length === 0 || forceUpdate || isBookUpdated) {
		if (!forceUpdate) {
			//* Book is not in database
			socket.emit('log', {
				message: 'Book not found in database',
			});
		}
		socket.emit('log', {
			message: 'Fetching book',
		});

		//-- 1. Lauching browser and navigating to FanFiction.net Story

		const bookInfo: BookInfo = getBookInfoDefaultState('F-', bookid);
		const fetchBookInfo = async () => {
			await page.goto(`https://www.fanfiction.net/s/${bookid}`);
			//** Wait for the Cloudflare few seconds loading screen to disappear
			await page.waitForSelector('#storytext');

			//-- 2. Getting the book info
			const bookInfoEle = (await page.$(
				'#profile_top',
			)) as ElementHandle<HTMLDivElement>;

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
				(ele: any) => ele.href,
			);
			bookInfo.description = await bookInfoEle.$eval(
				'div.xcontrast_txt',
				(ele) => ele.innerHTML,
			);
			const otherInfo = await page.$eval(
				'span.xgray.xcontrast_txt',
				(ele: any) =>
					ele.textContent.split('-').map((str: string) => str.trim()),
			);
			bookInfo.url = `https://www.fanfiction.net/s/${bookid}`;
			bookInfo.rating = otherInfo[0]
				.split('Rated: ')
				.filter((v: string | undefined) => v)[0]
				.trim();
			otherInfo.shift();
			[bookInfo.language, bookInfo.genre, bookInfo.fandom] = otherInfo;

			otherInfo.map((val: string) => {
				if (val.includes('Chapters')) {
					bookInfo.chapterLength = Number(
						val
							.split('Chapters: ')
							.filter((v) => v.trim() && v)[0]
							.trim(),
					);
				}
				if (val.includes('Words')) {
					bookInfo.words = Number(
						val
							.split('Words: ')
							.filter((v) => v.trim() && v)[0]
							.trim(),
					);
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
					const status = val
						.split('Status: ')
						.filter((v) => v.trim() && v)[0]
						.trim();
					if (status === 'Completed') {
						bookInfo.status = 'Completed';
					}
				}
			});

			socket.emit('log', {
				message: `Book info fetched`,
			});
		};
		while (error && errorCount < 5) {
			try {
				await fetchBookInfo();
				error = false;
			} catch (error: unknown) {
				errorCount++;
				socket.emit('log', {
					message: `Error fetching book info, retrying...`,
					type: 'single',
				});
				errorMessage = JSON.stringify(error);
			}
		}
		if (errorCount >= 5) {
			socket.emit('error', {
				message: `Failed to fetch book info`,
			});
			if (user.email) {
				SendEmail('heetkv@gmail.com', {
					type: templates.userError,
					book: `${bookInfo.title} by ${bookInfo.author}`,
					error: {
						message: errorMessage,
						site: 'Fanfiction',
						time: moment().format('MMMM Do YYYY, h:mm:ss a'),
					},
					user,
				});
			}

			return {
				error: true,
			};
		}
		//-- 3. Creating the book cover
		socket.emit('log', {
			message: `Creating book cover`,
		});
		bookInfo.cover = await createBookCover(bookInfo);

		socket.emit('bookinfo', { ...bookInfo, extension });

		//-- 4. Getting the book chapters
		socket.emit('log', {
			message: `Fetching chapters`,
		});
		socket.emit('log', {
			message: `Fetching chapter <b> 1 / ${bookInfo.chapterLength} </b>`,
		});
		const chapter1Data = await page.$eval('#storytext', (ele) => ele.innerHTML);
		let chapterName = 'Chapter 1';
		if (Number(bookInfo.chapterLength) > 1) {
			const chapterNameArr = await page.$eval(
				'#chap_select option[selected]',
				(ele: any) => ele.textContent.split(' '),
			);
			chapterNameArr.shift();
			chapterName = chapterNameArr.join('  ');
		}

		const chapters: Chapter[] = [
			{
				title: chapterName,
				content: chapter1Data,
				url: `https://www.fanfiction.net/s/${bookid}`,
			},
		];

		socket.emit('bookInfo', { ...bookInfo, extension });

		for (let i = 2; i <= Number(bookInfo.chapterLength); i++) {
			error = true;
			socket.emit('log', {
				message: `Fetching chapter <b> ${i} / ${bookInfo.chapterLength} </b>`,
			});
			const fetchChapter = async (i: number) => {
				await page.goto(`https://m.fanfiction.net/s/${bookid}/${i}`);
				await page.waitForSelector('#storycontent');
				const chapterData = await page.$eval(
					'#storycontent',
					(ele) => ele.innerHTML,
				);
				const chapterName = await page.$eval('#content', (ele: any) => {
					const infoArr = ele.textContent
						.split('\n')
						.filter((v: string) => v.trim());
					return infoArr[infoArr.length - 1];
				});
				chapters.push({
					title: chapterName,
					content: chapterData,
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
			if (errorCount >= 5) {
				socket.emit('error', {
					message: `Failed to fetch chapter ${i}`,
				});
				if (user.email) {
					SendEmail('heetkv@gmail.com', {
						type: templates.userError,
						book: `${bookInfo.title} by ${bookInfo.author}`,
						error: {
							message: errorMessage,
							site: 'Fanfiction',
							time: moment().format('MMMM Do YYYY, h:mm:ss a'),
						},
						user,
					});
				}
				return {
					error: true,
				};
			}
		}
		await browser.close();

		//-- 5. Sending the book to the cloud storage and saving the book info in the database
		socket.emit('log', {
			message: `Saving book to database`,
		});
		const dataUrl = await sendDataToCloud(
			{ ...bookInfo, chapters },
			cloudinary,
		);
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
		book = { ...bookInfo, chapters };
	}

	//- Creating file and sending buffer to the frontend
	if (extension === 'epub') {
		socket.emit('log', {
			message: `Creating epub file`,
		});
		const epub = await createEpub(book, socket, user, 'Fanfiction');
		if ('error' in epub) {
			socket.emit('error', {
				message: `Error creating epub file`,
				type: 'single',
			});
			return { error: true };
		}
		const { buffer, size } = epub;
		socket.emit('log', {
			message: `Book File Created`,
		});
		return { book, buffer, size };
	} else if (extension === 'html') {
		socket.emit('log', {
			message: `Creating epub file`,
		});
		const { buffer, size } = await createHTML(book);
		socket.emit('log', {
			message: `Book File Created`,
		});
		return { book, buffer, size };
	}
	return { error: true };
};
