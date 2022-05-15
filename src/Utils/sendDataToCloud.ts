import { Book, BookInfo } from '../interfaces';

const fs = require('fs');

const sendDataToCloud = async (book: Book, cloudinary: any) => {
	let file = JSON.stringify(book);
	await fs.writeFileSync(`${book.uid}.txt`, file);

	const url = await cloudinary.uploader.upload(`${book.uid}.txt`, {
		resource_type: 'raw',
		folder: 'bookData',
		format: 'txt',
		public_id: `${book.uid}.txt`,
	});
	fs.rm(`${book.uid}.txt`, (err: Error) => {
		if (err) {
			return console.log(err);
		}
	});
	return url.url;
};
export default sendDataToCloud;
