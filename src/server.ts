import http from 'http';
import mysql from 'mysql2';
import JSZip from 'jszip';
import { Server } from 'socket.io';
const server = http.createServer();
const io = new Server(server, {
	cors: {
		origin: [
			'http://localhost:3001',
			'https://fanfic2book.vercel.app',
			'https://fanfic2book.netlify.app',
		],
	},
});
import dotenv from 'dotenv';
dotenv.config();
import cloudinary from 'cloudinary';
cloudinary.v2.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.API_KEY,
	api_secret: process.env.API_SECRET,
});
const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
});
const db = pool.promise();
import FanFiction from './Web Scrappers/FanFiction.NET/FanFiction';
import { templates, SendEmail } from './Utils/SendEmail';
import FanFictionUser from './Web Scrappers/FanFiction.NET/FanFictionUser';
import A03 from './Web Scrappers/AO3/AO3';
import AO3Series from './Web Scrappers/AO3/AO3Series';
import AO3User from './Web Scrappers/AO3/AO3User';
import Wattpad from './Web Scrappers/Wattpad/Wattpad';

import { decrypt } from './Utils/Encryption';
import fs from 'fs';
import { User } from './interfaces';
import WattpadChapter from './Web Scrappers/Wattpad/WattpadChapter';
const saveToDB = async () => {
	const books = await cloudinary.v2.search
		.expression('resource_type:raw AND folder:bookData')
		.sort_by('public_id', 'desc')
		.max_results(100)
		.execute();
	books.resources.forEach(async (book: any) => {
		await db.query(`INSERT INTO fanfic2book.all_books
		(updated, info, id)
		VALUES(CURRENT_TIMESTAMP, '${book.url}', '${book.filename.split('.')[0]}');`);
		console.log(`Saved ${book.filename} to database`);
	});
};
// AO3Series('1650886').then(console.log);
// WattpadUser('TamaraLush').then(console.log);
// saveToDB();
io.on('connection', async (socket) => {
	console.log('a user connected');
	let user: User = {
		userid: '',
		email: '',
		username: '',
		downloads: 0,
		name: '',
	};
	socket.on('join', async (data) => {
		const { isUserLogin } = data;

		if (isUserLogin) {
			user = {
				...data,
			};
		} else {
			const [results] = await db.query(
				`SELECT * FROM user_info WHERE ip = '${socket.request.connection.remoteAddress}' AND userid IS NULL`,
			);
			if ((results as any).length > 0) {
				const userInfo = (results as any)[0];

				user.downloads = userInfo.downloads;
			} else {
				await db.query(
					`INSERT INTO user_info(ip) VALUES('${socket.request.connection.remoteAddress}')`,
				);
				user.downloads = 0;
			}
		}
	});

	socket.on('getbook', async (data) => {
		const { site, extension, id, type, forceUpdate } = data;
		console.log(data);
		if (!user.userid) {
			console.log(user);
			if (user.downloads >= 5) {
				console.log('dsajds');
				socket.emit('error', 'You have reached your download limit');
				socket.emit('log', {
					message: '<b>You have reached your download limit</b>',
				});
				return;
			}
		}

		switch (site) {
			case 'fanfiction':
				if (type === 'story') {
					const scrapData = await FanFiction({
						bookid: id,
						extension,
						socket,
						cloudinary: cloudinary.v2,
						db,
						forceUpdate,
						user,
					});
					user.downloads++;
					if ('error' in scrapData) {
						break;
					}
					const { book, buffer } = scrapData;
					await db.query(
						`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
					);
					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});
					socket.emit('success', {
						buffer,
						...book,
						extension,
						downloads: user.downloads,
					});
				} else if (type === 'user') {
					socket.emit('log', {
						message: 'Loading ...',
					});
					const bookids = await FanFictionUser(id, socket, user);
					if ('error' in bookids) {
						break;
					}
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					if (user.downloads - bookids.length < 0 && !user.userid) {
						socket.emit('log', {
							message: `<b>You can only download ${
								5 - user.downloads
							} books sign up now to download unlimited books</b>`,
						});
					} else {
						socket.emit('log', {
							message: `<b>Downloading ${bookids.length} books</b>`,
						});
					}

					const bookUserCanDownload = user.userid
						? bookids.length
						: 5 - user.downloads;

					let counter = 0;
					let error = true;
					let errorCount = 0;
					console.log(user, bookUserCanDownload);
					const getBook = async () => {
						if (counter < bookids.length) {
							if ((user.downloads !== 5 && !user.userid) || user.userid) {
								socket.emit('log', {
									message: `Fetching <b>${bookids[counter][1]}( ${
										counter + 1
									} / ${bookUserCanDownload} )</b>`,
								});
								const book = await FanFiction({
									bookid: bookids[counter][0],
									extension,
									socket,
									cloudinary: cloudinary.v2,
									db,
									forceUpdate: false,
									user,
								});
								if ('error' in book) {
									return;
								}
								counter++;
								user.downloads++;
								await db.query(
									`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
								);
								socket.emit('success', {
									buffer: book.buffer,
									...book.book,
									extension,
									downloads: user.downloads,
									isLast: counter === bookids.length,
								});
								getBook();
							} else {
								socket.emit('log', {
									message: `<b>You have reached your download limit 1</b>`,
								});
							}
						} else {
							socket.emit('log', {
								message: 'Fetched books',
								type: 'single',
							});
						}
					};
					while (error && errorCount < 5) {
						try {
							getBook();
							error = false;
						} catch (err) {
							socket.emit('log', {
								message: 'Error fetching book',
							});
							errorCount++;
						}
					}
				}
				break;
			case 'archiveofourown':
				if (type === 'story') {
					user.downloads++;
					await db.query(
						`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
					);
					const scrapData = await A03({
						extension,
						socket,
						cloudinary: cloudinary.v2,
						db,
						forceUpdate,
						user,
						bookid: id,
					});

					if ('error' in scrapData) {
						return;
					}
					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});
					const { buffer, book } = scrapData;
					socket.emit('success', {
						...book,
						buffer,
						extension,
						downloads: user.downloads,
						isLast: true,
					});
				}
				if (type === 'series') {
					const bookids = await AO3Series(id);
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					if (user.downloads - bookids.length < 0 && !user.userid) {
						socket.emit('log', {
							message: `<b>You can only download ${
								5 - user.downloads
							} books sign up now to download unlimited books</b>`,
						});
					} else {
						socket.emit('log', {
							message: `<b>Downloading ${bookids.length} books</b>`,
						});
					}

					const bookUserCanDownload = user.userid
						? bookids.length
						: 5 - user.downloads;

					let counter = 0;
					let error = true;
					let errorCount = 0;
					const getBook = async () => {
						if (counter < bookids.length) {
							if ((user.downloads !== 5 && !user.userid) || user.userid) {
								socket.emit('log', {
									message: `Fetching <b>${bookids[counter][1]} ( ${
										counter + 1
									} / ${bookUserCanDownload} )</b>`,
								});

								const book = await A03({
									extension,
									bookid: bookids[counter][0],
									socket,
									cloudinary: cloudinary.v2,
									db,
									forceUpdate: false,
									user,
								});
								if ('error' in book) {
									return;
								}
								counter++;
								user.downloads++;
								await db.query(
									`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
								);
								socket.emit('success', {
									buffer: book.buffer,
									...book.book,
									extension,
									downloads: user.downloads,
									isLast: counter === bookids.length,
								});
								getBook();
							} else {
								socket.emit('log', {
									message: `<b>You have reached your download limit</b>`,
								});
							}
						} else {
							socket.emit('log', {
								message: 'Fetched books',
								type: 'single',
							});
						}
					};
					while (error && errorCount < 5) {
						try {
							getBook();
							error = false;
						} catch (err) {
							socket.emit('log', {
								message: 'Error fetching book',
							});
							errorCount++;
						}
					}
				}
				if (type === 'user') {
					const bookids = await AO3User(id);
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					if (user.downloads - bookids.length < 0 && !user.userid) {
						socket.emit('log', {
							message: `<b>You can only download ${
								5 - user.downloads
							} books sign up now to download unlimited books</b>`,
						});
					} else {
						socket.emit('log', {
							message: `<b>Downloading ${bookids.length} books</b>`,
						});
					}

					const bookUserCanDownload = user.userid
						? bookids.length
						: 5 - user.downloads;

					let counter = 0;
					let error = true;
					let errorCount = 0;
					const getBook = async () => {
						if (counter < bookids.length) {
							if ((user.downloads !== 5 && !user.userid) || user.userid) {
								socket.emit('log', {
									message: `Fetching <b>${bookids[counter][1]} ( ${
										counter + 1
									} / ${bookUserCanDownload} )</b>`,
								});
								const book = await A03({
									extension,
									bookid: bookids[counter][0],
									socket,
									cloudinary: cloudinary.v2,
									db,
									forceUpdate: false,
									user,
								});
								if ('error' in book) {
									return;
								}
								counter++;
								user.downloads++;
								await db.query(
									`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
								);

								socket.emit('success', {
									buffer: book.buffer,
									...book.book,
									extension,
									downloads: user.downloads,
									isLast: counter === bookids.length,
								});
								getBook();
							} else {
								socket.emit('log', {
									message: `<b>You have reached your download limit</b>`,
								});
							}
						} else {
							socket.emit('log', {
								message: 'Fetched books',
								type: 'single',
							});
						}
					};
					while (error && errorCount < 5) {
						try {
							getBook();
							error = false;
						} catch (err) {
							socket.emit('log', {
								message: 'Error fetching book',
							});
							errorCount++;
						}
					}
				}
				break;
			case 'wattpad':
				if (type === 'story') {
					const scrapData = await Wattpad({
						extension,
						bookid: id,
						socket,
						cloudinary: cloudinary.v2,
						db,
						forceUpdate,
						user,
					});
					if ('error' in scrapData) break;
					user.downloads++;
					await db.query(
						`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
					);
					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});
					socket.emit('success', {
						...scrapData.book,
						buffer: scrapData.buffer,
						extension,
						downloads: user.downloads,
						isLast: true,
					});
				}
				if (type === 'chapter') {
					const bookid = await WattpadChapter(id, socket);
					const scrapData = await Wattpad({
						extension,
						bookid,
						socket,
						cloudinary: cloudinary.v2,
						db,
						forceUpdate,
						user,
					});
					if ('error' in scrapData) break;
					user.downloads++;
					await db.query(
						`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
					);
					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});
					socket.emit('success', {
						...scrapData.book,
						buffer: scrapData.buffer,
						extension,
						downloads: user.downloads,
						isLast: true,
					});
				}
		}
	});
	socket.on('sendtoemail', async (data) => {
		let { site, extension, id, type, forceUpdate, buffer, bookInfo } = data;
		console.log(data);
		socket.emit('log', {
			message: 'Fetching book',
			type: 'single',
		});
		switch (site) {
			case 'fanfiction': {
				if (type === 'story') {
					if (!bookInfo) {
						const data = await FanFiction({
							bookid: id,
							extension,
							socket,
							cloudinary: cloudinary.v2,
							db,
							forceUpdate,
							user,
						});
						if ('error' in data) return;
						buffer = data.buffer;
						bookInfo = data.book;
					}

					SendEmail(
						user.email,
						{
							type: templates.bookCreated,
							author: bookInfo.author,
							title: bookInfo.title,
							extension,
							name: user.name.split(' ')[0],
						},
						[
							{
								filename: `${bookInfo.title} by ${bookInfo.author}.${extension}`,
								content: Buffer.from(buffer).toString('base64'),
							},
						],
					);
					socket.emit('log', {
						message: 'Email sent',
						type: 'single',
					});
				}
				if (type === 'user') {
					const bookids = await FanFictionUser(id, socket, user);
					if ('error' in bookids) return;
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					if (user.downloads - bookids.length < 0 && !user.userid) {
						socket.emit('log', {
							message: `<b>You can only download ${
								5 - user.downloads
							} books sign up now to download unlimited books</b>`,
						});
					} else {
						socket.emit('log', {
							message: `<b>Downloading ${bookids.length} books</b>`,
						});
					}

					const bookUserCanDownload = user.userid
						? bookids.length
						: 5 - user.downloads;

					let counter = 0;
					let error = true;
					let errorCount = 0;
					const books: {
						filename: string;
						content: string;
						size: number;
					}[] = [];
					let totalSize = 0;
					const getBook = async (callback: () => void) => {
						if (counter < bookids.length) {
							if ((user.downloads !== 5 && !user.userid) || user.userid) {
								socket.emit('log', {
									message: `Fetching <b>${bookids[counter][1]} ( ${
										counter + 1
									} / ${bookUserCanDownload} )</b>`,
								});
								const book = await FanFiction({
									bookid: bookids[counter][0],
									extension,
									socket,
									cloudinary: cloudinary.v2,
									db,
									forceUpdate: false,
									user,
								});

								counter++;
								user.downloads++;
								await db.query(
									`UPDATE user_info SET downloads = ${user.downloads} WHERE ip = '${socket.request.connection.remoteAddress}'`,
								);
								if ('error' in book) {
									return;
								}
								if (book.buffer) {
									books.push({
										filename: `${book.book.title} by ${book.book.author}.${extension}`,
										content: book.buffer.toString('base64'),
										size: book.size,
									});
									totalSize += book.size;
								}
								getBook(callback);
							} else {
								socket.emit('log', {
									message: `<b>You have reached your download limit</b>`,
								});
							}
						} else {
							console.log('Running callback');
							await callback();
						}
					};
					const afterAllBooks = async () => {
						socket.emit('log', {
							message: 'Fetched books',
							type: 'single',
						});
						console.log('Total size of books in bytes: ', totalSize);
						totalSize = Number((totalSize / Math.pow(10, 6)).toFixed(2));
						console.log('Total size of books in MegaByte', totalSize);

						const start = new Date();
						let isZipCreated = false;
						let counter = 0;
						let createNewZip = true;
						const zips = [];
						while (!isZipCreated) {
							createNewZip = true;
							const zip = new JSZip();
							let size = 0;
							while (createNewZip) {
								const book = books[counter];
								size += book.size;
								zip.file(book.filename, Buffer.from(book.content, 'base64'), {
									base64: true,
								});
								counter++;
								if (
									(book && size + book.size > 50000000) ||
									counter === books.length
								) {
									createNewZip = false;
								}
								console.log(size / Math.pow(10, 6) + 'MB at' + counter);
							}

							const zipBuffer = await zip.generateAsync({
								type: 'base64',
								compression: 'DEFLATE',
								compressionOptions: {
									level: 9,
								},
							});

							zips.push(zipBuffer);
							fs.writeFileSync(`book.zip`, zipBuffer);
							if (counter === books.length) {
								isZipCreated = true;
							}
						}
						const stop = new Date();
						const time = stop.getTime() - start.getTime();
						console.log('Time taken to download: ', time / 1000, 'seconds');
					};
					while (error && errorCount < 5) {
						try {
							getBook(afterAllBooks);
							error = false;
						} catch (err) {
							socket.emit('log', {
								message: 'Error fetching book',
							});
							errorCount++;
						}
					}
				}
				break;
			}
			case 'archiveofourown': {
				if (type === 'story') {
					if (!bookInfo) {
						const data = await A03({
							extension,
							bookid: id,
							socket,
							cloudinary: cloudinary.v2,
							db,
							forceUpdate,
							user,
						});
						if ('error' in data) return;

						buffer = data.buffer;
						bookInfo = data.book;
					}
					SendEmail(
						user.email,
						{
							type: templates.bookCreated,
							author: bookInfo.author,
							title: bookInfo.title,
							extension,
							name: user.name.split(' ')[0],
						},
						[
							{
								filename: `${bookInfo.title} by ${bookInfo.author}.${extension}`,
								content: Buffer.from(buffer).toString('base64'),
							},
						],
					);
					socket.emit('log', {
						message: 'Email sent',
						type: 'single',
					});
				}
				break;
			}
			case 'wattpad': {
				if (type === 'story') {
					if (!bookInfo) {
						const data = await Wattpad({
							extension,
							bookid: id,
							socket,
							cloudinary: cloudinary.v2,
							db,
							forceUpdate,
							user,
						});
						if ('error' in data) return;
						buffer = data.buffer;
						bookInfo = data.book;
					}
					SendEmail(
						user.email,

						{
							type: templates.bookCreated,
							author: bookInfo.author,
							title: bookInfo.title,
							extension,
							name: user.name.split(' ')[0],
						},
						[
							{
								filename: `${bookInfo.title} by ${bookInfo.author}.${extension}`,
								content: Buffer.from(buffer).toString('base64'),
							},
						],
					);
					socket.emit('log', {
						message: 'Email sent',
						type: 'single',
					});
				}
				break;
			}
		}
	});
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`listening on *:${port}`);
});
