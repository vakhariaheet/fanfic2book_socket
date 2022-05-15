import epub from 'epub-gen-memory';
import { getDate } from './getDate';
import { templates, SendEmail } from './SendEmail';
import { Book, User } from '../interfaces';
import { Socket } from 'socket.io';
import moment from 'moment';
export default async (
	book: Book,
	socket: Socket,
	user: User,
	site: 'Wattpad' | 'Fanfiction' | 'ArchiveOfOurOwn',
): Promise<
	| {
			buffer: Buffer;
			size: number;
	  }
	| {
			error: Boolean;
	  }
> => {
	const epubBuffer = await epub(
		{
			title: book.title,
			author: book.author,
			cover: book.cover,
			description: book.description,
			tocTitle: 'Chapters',
			tocInTOC: false,
		},
		[
			{
				title: 'Book Info',
				content: `<h3><a href='${book.url}'>${book.title} </a> by <a href='${
					book.authorUrl || ''
				}'>${book.author}</a> </h3>
        ${book.fandom ? `<h4>Fandom : ${book.fandom}</h4>` : ''}
        ${book.language ? `<h4>Language : ${book.language}</h4>` : ''}
        ${book.words ? `<h4>Words : ${book.words}</h4>` : ''}
        ${
					book.published
						? `<h4>Published : ${getDate(book.published, 'Do MMM YYYY')}</h4>`
						: ''
				}
        ${book.chapterLength ? `<h4>Chapters : ${book.chapterLength}</h4>` : ''}

        ${book.status ? `<h4>Status : ${book.status}</h4>` : ''}
        ${book.description ? `<h4>Summary : ${book.description}</h4>` : ''}
        ${book.rating ? `<h4>Rating : ${book.rating}</h4>` : ''}
        `,
			},
			...book.chapters.map((chapter) => ({
				title: chapter.title,
				content: chapter.content,
				url: chapter.url,
			})),
		],
	)
		.then((epubBuffer) => {
			socket.emit('log', {
				message: `Generated epub file for ${book.title}`,
				type: 'single',
			});
			return epubBuffer;
		})
		.catch((err) => {
			socket.emit('error', {
				message: 'Error in generating epub file',
			});
			if (user.email) {
				SendEmail('heetkv@gmail.com', {
					type: templates.userError,
					book: `${book.title} by ${book.author}`,
					error: {
						message: JSON.stringify(err),
						site,
						time: moment().format('Do MMM YYYY, h:mm:ss a'),
					},
					user,
				});
			}
		});
	socket.emit('log', {
		message: `Error in generating epub file Please Try Again`,
	});
	if (epubBuffer) {
		return { buffer: epubBuffer, size: epubBuffer.byteLength };
	}
	return { error: true };
};
