import {
	BookInfo,
	ScrapperProps,
	Book,
	ScrapperSuccess,
	ScrapperError,
} from '../../interfaces';
import puppeteer from 'puppeteer-extra';
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import createBookCover from '../../Utils/createBookCover';
import sendDataToCloud from '../../Utils/sendDataToCloud';
import createEpub from '../../Utils/createEpub';
import createHTML from '../../Utils/createHTML';
import axios from 'axios';
import { getDate } from '../../Utils/getDate';
import {
	getBookDefaultState,
	getBookInfoDefaultState,
} from '../../Utils/defaultState';
import { SendEmail, templates } from '../../Utils/SendEmail';
import moment from 'moment';
puppeteer.use(StealthPlugin());

const AO3 = async ({
	extension,
	bookid,
	socket,
	cloudinary,
	db,
	forceUpdate,
	user,
}: ScrapperProps): Promise<ScrapperSuccess | ScrapperError> => {
	let book: Book = getBookDefaultState('A-', bookid);
	socket.emit('log', {
		message: 'Checking if the book is already in the database',
		type: 'single',
	});

	//- 1. Check if book is in database
	const [result]: any = await db.query(
		` SELECT * FROM all_books WHERE id ='A-${bookid}'`,
	);

	if (result.length > 0 && !forceUpdate) {
		//- 2. If Book is already in database and forceUpdate is false
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
	} else {
		//- 2. Else Lauching browser and navigating to FanFiction.net Story
		const browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});
		const chapters: {
			title: string;
			content: string;
			url: string;
		}[] = [];
		const bookInfo: BookInfo = getBookInfoDefaultState('A-', bookid);
		let error = true;
		let errorCount = 0;
		let errorMessage = '';
		const page = await browser.newPage();
		await page.setUserAgent(
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
		);

		//- 3. Navigating to the story
		const fetchBookInfo = async () => {
			await page.goto(
				`https://archiveofourown.org/works/${bookid}?view_adult=true&view_full_work=true`,
			);

			bookInfo.title = await page.$eval('h2.title', (ele: any) =>
				ele.textContent.trim(),
			);
			[bookInfo.author, bookInfo.authorUrl] = await page.$eval(
				"a[rel='author']",
				(ele: any) => [ele.textContent, ele.href],
			);
			bookInfo.url = `https://archiveofourown.org/works/${bookid}`;
			socket.emit('log', {
				message: `Fetching book info for ${bookInfo.title} by ${bookInfo.author}`,
			});
			bookInfo.rating = await page.$eval('dd.rating', (ele: any) =>
				ele.textContent.trim(),
			);
			bookInfo.fandom = await page.$eval('dd.fandom', (ele: any) =>
				ele.textContent.trim(),
			);
			bookInfo.language = await page.$eval('dd.language', (ele: any) =>
				ele.textContent.trim(),
			);
			bookInfo.published = await page
				.$eval('dd.published', (ele: any) => ele.textContent)
				.then((date: any) => {
					console.log(date, 'AO3');
					return getDate(date);
				});
			console.log(bookInfo.published, 'AO3 1111');
			const status = await page.$('dd.status');
			bookInfo.updated = status
				? await page
						.$eval('dd.status', (ele: any) =>
							ele ? ele.innerText.trim() : ' - ',
						)
						.then((date: string) => {
							console.log(date, 'AO3 updated');
							return date !== ' - ' ? getDate(date) : date;
						})
				: ' - ';
			console.log(bookInfo.updated, 'AO3 1111');
			bookInfo.description = await page.$eval(
				'.summary.module p',
				(ele: any) => ele.textContent,
			);
			bookInfo.words = await page.$eval('dd.words', (ele: any) =>
				Number(ele.textContent),
			);

			[bookInfo.chapterLength, bookInfo.status] = await page.$eval(
				'dd.chapters',
				(ele: any) => {
					const chapterText = ele.textContent;
					const chapterArr = chapterText.split('/');
					if (chapterArr[1] === '?') {
						return [Number(chapterArr[0]), 'Ongoing'];
					}
					return [Number(chapterArr[0]), 'Completed'];
				},
			);
		};

		while (error && errorCount < 3) {
			try {
				await fetchBookInfo();
				error = false;
				errorCount = 0;
			} catch (error) {
				errorMessage = JSON.stringify(error);
				socket.emit('log', {
					message: `Failed to fetch book info`,
				});
				socket.emit('log', {
					message: `Retrying...`,
				});
				errorCount++;
			}
		}
		error = true;
		if (errorCount >= 3) {
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

		//- 4. Creating book cover
		socket.emit('log', {
			message: `Creating Book Cover`,
		});
		bookInfo.cover = await createBookCover(bookInfo);
		socket.emit('bookinfo', { ...bookInfo, extension });

		//- 5. Getting book chapters
		socket.emit('log', {
			message: `Featching Chapters`,
		});
		const chapterTitles = await page.$$eval(
			'div.chapter.preface.group h3.title',
			(eles: any) => {
				return eles.map((ele: any, index: number) => {
					if (!ele) return `Chapter ${index + 1}`;
					const chapterHead = ele.textContent.trim().split(':')[1];
					if (!chapterHead) return `Chapter ${index + 1}`;
					return chapterHead.trim();
				});
			},
		);

		const fetchChapters = async () => {
			for (let i = 1; i < chapterTitles.length; i++) {
				const chapter: {
					title: string;
					content: string;
					url: string;
				} = {
					title: '',
					content: '',
					url: '',
				};
				chapter.title = chapterTitles[i - 1];
				chapter.content = await page.$eval(
					`#chapter-${i} [role="article"].userstuff`,
					(ele: any) => {
						ele.removeChild(ele.firstElementChild);
						return ele.innerHTML;
					},
				);
				chapter.url = `https://archiveofourown.org/works/${bookid}?view_full_work=true#chapter-${i}`;
				chapters.push(chapter);
			}
		};
		while (error && errorCount < 5) {
			try {
				await fetchChapters();
				error = false;
			} catch (e) {
				error = true;
				errorMessage = JSON.stringify(e);
				socket.emit('log', {
					message: `Error fetching chapter`,
				});
				socket.emit('log', {
					message: `Retrying...`,
				});
				errorCount++;
			}
		}
		if (errorCount >= 5) {
			socket.emit('error', {
				message: `Error fetching chapter`,
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
		socket.emit('log', {
			message: `<b>All Chapters Fetched</b>`,
		});

		//- 6. Closing browser
		await browser.close();

		//- 7. Uploading the book to cloudinary & database
		socket.emit('log', {
			message: `Saving Book to Database`,
		});
		await sendDataToCloud({ ...bookInfo, chapters }, cloudinary);
		if (forceUpdate) {
			await db.query(`
			UPDATE fanfic2book.all_books
			SET updated=CURRENT_TIMESTAMP
			WHERE id='A-${bookid}';
`);
		} else {
			await db.query(`INSERT INTO fanfic2book.all_books
			(updated, info, id)
			VALUES(CURRENT_TIMESTAMP, 'https://res.cloudinary.com/fanfic2book/raw/upload/bookData/A-${bookInfo.id}.txt', 'A-${bookid}');`);
		}
		book = { ...bookInfo, chapters };
	}
	//- 8. Creating the book and returning the buffer and book info
	socket.emit('log', {
		message: `Creating Book`,
	});
	if (extension === 'epub') {
		const epub = await createEpub(book, socket, user, 'ArchiveOfOurOwn');
		if ('error' in epub) {
			return {
				error: true,
			};
		}
		const { buffer, size } = epub;
		return { book, buffer, size };
	} else if (extension === 'html') {
		console.log(book.published, book.updated, 'book.published, book.updated');
		const { buffer, size } = await createHTML(book);
		return { book, buffer, size };
	}
	return {
		error: true,
	};
};

export default AO3;
