export interface Book extends BookInfo {
	chapters: [
		{
			title: string;
			url: string;
			content: string;
		},
	];
}
export interface BookInfo {
	title: string;
	author: string;
	authorUrl: string;
	description: string;
	url: string;
	rating: string;
	language: string;
	genre: string;
	fandom: string;
	chapterLength: number;
	words: number;
	published: string;
	status: string;
	id: string;
	uid: string;
	cover: string;
	updated?: string;
}

export interface User {
	userid: string;
	email: string;
	username: string;
	downloads: number;
	name: string;
}
