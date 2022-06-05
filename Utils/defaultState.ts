import { Book, BookInfo } from '../interfaces';

export const getBookDefaultState: (
	sitePrefix: string,
	bookid: string,
) => Book = (sitePrefix, bookid) => {
	return {
		...getBookInfoDefaultState(sitePrefix, bookid),
		chapters: [],
	};
};
export const getBookInfoDefaultState: (
	sitePrefix: string,
	bookid: string,
) => BookInfo = (sitePrefix, bookid) => ({
	title: '',
	author: '',
	authorUrl: '',
	chapterLength: 1,
	cover: '',
	description: '',
	genre: '',
	fandom: '',
	language: '',
	rating: '',
	status: '',
	url: '',
	words: 0,
	published: '',
	id: bookid,
	uid: sitePrefix + bookid,
	updated: '',
});
