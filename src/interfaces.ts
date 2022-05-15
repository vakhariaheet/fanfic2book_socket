import { Pool } from 'mysql2/promise';
import { Socket } from 'socket.io';
import { templates } from './Utils/SendEmail';
export interface Book extends BookInfo {
	chapters: Chapter[];
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

export interface Chapter {
	title: string;
	url: string;
	content: string;
}
export interface User {
	userid: string;
	email: string;
	username: string;
	downloads: number;
	name: string;
}
export interface ScrapperProps {
	extension: string;
	bookid: string;
	socket: Socket;
	cloudinary: any;
	db: Pool;
	forceUpdate: Boolean;
	user: User;
}
export interface ScrapperSuccess {
	book: Book;
	buffer: Buffer;
	size: number;
}
export interface ScrapperError {
	error: boolean;
}
export interface EmailTemplates {
	newUser: 'd-a48b00c1e9184365abec57fe4cf211f7';
	bookCreated: 'd-3bdc25b225834025b80a9c3a20ab08dd';
	userError: 'd-4b6c9c21fec24011830354d98e197b6d';
}
export interface bookCreatedEmailProps {
	type: EmailTemplates['bookCreated'];
	author: string;
	title: string;
	extension: string;
	name: string;
}
export interface EmailAttachment {
	filename: string;
	content: string;
}
export interface UserErrorEmailProps {
	type: EmailTemplates['userError'];
	error: {
		message: string;
		time: string;
		site: 'Wattpad' | 'Fanfiction' | 'ArchiveOfOurOwn';
	};
	user: User;
	book: string;
}
