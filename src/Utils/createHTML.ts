import { Book } from '../interfaces';
import bookToHTML from './bookToHTML';
const Blob = require('node-blob');
const createHTML = async (book: Book) => {
	const html = await bookToHTML(book);
	const blob = new Blob([html], { type: 'text/html' });
	return { buffer: blob.buffer as Buffer, size: blob.size };
};
export default createHTML;
