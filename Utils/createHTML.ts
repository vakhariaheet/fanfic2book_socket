import { Book } from '../interfaces';

const fs = require('fs');
import bookToHTML from './bookToHTML';
const Blob = require('node-blob');
module.exports = async (book: Book) => {
	const html = await bookToHTML(book);
	const blob = new Blob([html], { type: 'text/html' });

	return { buffer: blob.buffer, size: blob.size };
};
