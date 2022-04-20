const epubGen = require('epub-gen');
const fs = require('fs');
const { default: axios } = require('axios');
module.exports = async (bookInfo, socket, cloudinary, site) => {
	let fileBuffer;
	for (let i = 0; i < bookInfo.book.length; i++) {
		delete bookInfo.book[i].url;
	}
	const data = await new epubGen({
		title: bookInfo.title,
		author: bookInfo.author,
		publisher: 'FanFiction.net',
		date: bookInfo.updated,
		language: bookInfo.language,
		updated: bookInfo.updated,
		rights: 'FanFiction.net',
		cover: bookInfo.cover,
		src: bookInfo.url,
		output: `${__dirname}/../assets/files/${bookInfo.uid}.epub`,
		content: [
			{
				title: 'Book Info',
				data: `<h3><a href='${bookInfo.url}'>${
					bookInfo.title
				} </a> by <a href='${bookInfo.authorUrl || ''}'>${
					bookInfo.author
				}</a> </h3>
                ${bookInfo.fandom ? `<h4>Fandom : ${bookInfo.fandom}</h4>` : ''}
                ${
									bookInfo.language
										? `<h4>Language : ${bookInfo.language}</h4>`
										: ''
								}
                ${bookInfo.words ? `<h4>Words : ${bookInfo.words}</h4>` : ''}
				${bookInfo.published ? `<h4>Published : ${bookInfo.published}</h4>` : ''}
                ${
									bookInfo.chapters
										? `<h4>Chapters : ${bookInfo.chapters}</h4>`
										: ''
								}
				${bookInfo.updated ? `<h4>Updated : ${bookInfo.updated}</h4>` : ''}
				${bookInfo.status ? `<h4>Status : ${bookInfo.status}</h4>` : ''}
				${bookInfo.description ? `<h4>Summary : ${bookInfo.description}</h4>` : ''}
				${bookInfo.rating ? `<h4>Rating : ${bookInfo.rating}</h4>` : ''}
                `,
			},
			...bookInfo.book,
		],
	}).promise.then(
		async (e) => {
			socket.emit('log', {
				message: `Generated epub file for ${bookInfo.title}`,
				type: 'single',
			});
			try {
				const uploadResult = await cloudinary.uploader.upload(
					`${__dirname}/../assets/files/${bookInfo.uid}.epub`,
					{
						folder: 'temp',
						public_id: bookInfo.uid,
						resource_type: 'raw',
						format: 'epub',
					},
				);

				const { data: buffer } = await axios({
					method: 'get',
					url: uploadResult.url,
					responseType: 'arraybuffer',
				});

				cloudinary.uploader.destroy(
					`temp/${bookInfo.uid}.epub`,
					{ resource_type: 'raw' },
					function (error, result) {
						if (error) return error;
						socket.emit('log', {
							message: result,
						});
					},
				);
				fs.rm(`${__dirname}/../assets/files/${bookInfo.uid}.epub`, (err) => {
					if (err) {
						return console.log(err);
					}
				});
				return buffer;
			} catch (err) {
				console.log(err);
			}
		},
		(err) => console.error('Failed to generate Ebook because of ', err),
	);
	return data;
};
