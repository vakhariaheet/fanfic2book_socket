const http = require('http').createServer();
const mysql = require('mysql2');
const io = require('socket.io')(http, {
	cors: {
		origins: ['http://localhost:3001', 'https://fanfic2book.vercel.app/'],
	},
});
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
cloudinary.config({
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
const FanFiction = require('./Web Scrappers/FanFiction.NET/FanFiction');
const SendEmail = require('./Utils/SendEmail');
const FanFictionUser = require('./Web Scrappers/FanFiction.NET/FanFictionUser');
const A03 = require('./Web Scrappers/AO3/AO3');
const AO3Series = require('./Web Scrappers/AO3/AO3Series');
const AO3User = require('./Web Scrappers/AO3/AO3User');
const Wattpad = require('./Web Scrappers/Wattpad/Wattpad');
const WattpadUser = require('./Web Scrappers/Wattpad/WattpadUser');
const saveToDB = async () => {
	const books = await cloudinary.search
		.expression('resource_type:raw AND folder:bookData')
		.sort_by('public_id', 'desc')
		.max_results(100)
		.execute();
	books.resources.forEach(async (book) => {
		await db.query(`INSERT INTO fanfic2book.all_books
		(updated, info, id)
		VALUES(CURRENT_TIMESTAMP, '${book.url}', '${book.filename.split('.')[0]}');`);
		console.log(`Saved ${book.filename} to database`);
	});
};
// AO3Series('1650886').then(console.log);
// WattpadUser('TamaraLush').then(console.log);
// saveToDB();
io.on('connection', (socket) => {
	console.log('a user connected');

	socket.on('getbook', async (data) => {
		const { site, extension, id, type, forceUpdate } = data;
		switch (site) {
			case 'fanfiction':
				console.log('Fetching fanfiction book');
				if (type === 'story') {
					const { buffer, bookInfo } = await FanFiction(
						id,
						extension,
						socket,
						cloudinary,
						db,
						forceUpdate,
					);

					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});
					socket.emit('success', {
						buffer,
						...bookInfo,
						extension,
					});
				} else if (type === 'user') {
					const bookids = await FanFictionUser(id);
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					const books = [];
					let counter = 0;
					let error = true;
					let errorCount = 0;
					const getBook = () => {
						if (counter < bookids.length) {
							socket.emit('log', {
								message: `Fetching <b>${bookids[counter][1]}( ${
									counter + 1
								} / ${bookids.length} )</b>`,
							});
							FanFiction(
								bookids[counter][0],
								extension,
								socket,
								cloudinary,
								db,
							).then((book) => {
								socket.emit('success', {
									buffer: book.buffer,
									...book.bookInfo,
									extension,
								});
								counter++;
								getBook();
							});
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

					socket.emit('success', books);
				}
				break;
			case 'archiveofourown':
				if (type === 'story') {
					const { buffer, bookInfo, error } = await A03(
						extension,
						id,
						socket,
						cloudinary,
						db,
						forceUpdate,
					);
					if (error) {
						socket.emit('log', {
							message: 'Error fetching book',
							type: 'single',
						});
						return;
					}
					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});

					socket.emit('success', { ...bookInfo, buffer, extension });
				}
				if (type === 'series') {
					const bookids = await AO3Series(id);
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					const books = [];
					let counter = 0;
					const getBook = () => {
						if (counter < bookids.length) {
							socket.emit('log', {
								message: `Fetching <b>${bookids[counter][1]} ( ${
									counter + 1
								} / ${bookids.length} )</b>`,
							});
							A03(extension, bookids[counter][0], socket, cloudinary, db).then(
								(book) => {
									socket.emit('success', {
										buffer: book.buffer,
										...book.bookInfo,
										extension,
									});
									counter++;
									getBook();
								},
							);
						} else {
							socket.emit('log', {
								message: 'Fetched books',
								type: 'single',
							});
						}
					};
					getBook();
				}
				if (type === 'user') {
					const bookids = await AO3User(id);
					socket.emit('log', {
						message: `<b>${bookids.length}</b> books found`,
						type: 'single',
					});
					const books = [];
					let counter = 0;
					const getBook = () => {
						if (counter < bookids.length) {
							socket.emit('log', {
								message: `Fetching <b>${bookids[counter][1]} ( ${
									counter + 1
								} / ${bookids.length} )</b>`,
							});
							A03(extension, bookids[counter][0], socket, cloudinary, db).then(
								(book) => {
									socket.emit('success', {
										buffer: book.buffer,
										...book.bookInfo,
										extension,
									});
									counter++;
									getBook();
								},
							);
						} else {
							socket.emit('log', {
								message: 'Fetched books',
								type: 'single',
							});
						}
					};
					getBook();
					socket.emit('success', books);
				}
				break;
			case 'wattpad':
				if (type === 'story') {
					const { buffer, bookInfo, error } = await Wattpad(
						extension,
						id,
						socket,
						cloudinary,
						db,
						forceUpdate,
					);
					if (error) return;

					socket.emit('log', {
						message: 'Fetched book',
						type: 'single',
					});
					socket.emit('success', { ...bookInfo, buffer, extension });
				}
		}
	});
	socket.on('sendtoemail', async (data) => {
		const { site, extension, id, type, forceUpdate } = data;

		socket.emit('log', {
			message: 'Fetching book',
			type: 'single',
		});

		if (site === 'fanfiction' && type === 'story') {
			const { buffer, bookInfo, user } = await FanFiction(
				id,
				extension,
				socket,
				cloudinary,
				db,
				forceUpdate,
			);
			SendEmail(
				'prarthanadsanghvi@gmail.com',
				'bookCreated',
				{
					author: bookInfo.author,
					title: bookInfo.title,
					extension,
					name: 'Heet',
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
		if (site === 'archiveofourown' && type === 'story') {
			const { buffer, bookInfo } = await fromA03(
				extension,
				id,
				socket,
				cloudinary,
				db,
				forceUpdate,
			);
			SendEmail(
				'heet1476@gmail.com',
				'bookCreated',
				{
					author: bookInfo.author,
					title: bookInfo.title,
					extension,
					name: 'Heet',
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
	});
});

//Nightmare({
//    show:true,
//    openDevTools:{detach:true}
//}).goto("https://npmjs.org/epub-gen").then(() =>{})
const port = process.env.PORT || 3000;
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
