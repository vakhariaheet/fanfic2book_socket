const epubGen = require('epub-gen');
const fs = require('fs');

module.exports = async (bookInfo, book, socket, cloudinary) => {
	let fileBuffer;
	new epubGen({
		title: bookInfo.title,
		author: bookInfo.author,
		publisher: 'FanFiction.net',
		date: bookInfo.updated,
		language: bookInfo.language,
		updated: bookInfo.updated,
		rights: 'FanFiction.net',
		cover: bookInfo.cover,
		src: `https://www.fanfiction.net/${bookInfo.bookid}`,
		output: `${__dirname}/../assets/files/${bookInfo.uid}.epub`,
		content: [
			{
				title: 'Book Info',
				data: `<h3>${bookInfo.title || 'UNKNOWN'} by ${
					bookInfo.author || 'UNKNOWN'
				} </h3>
                <h4>Type : ${bookInfo.type || 'UNKNOWN'}</h4>
                <h4>Genre : ${bookInfo.genre || 'UNKNOWN'}</h4>
                <h4>Language : ${bookInfo.language || 'UNKNOWN'}</h4>
                <h4>Words : ${bookInfo.words || 'UNKNOWN'}</h4>
                <h4>Published : ${bookInfo.published || 'UNKNOWN'}</h4>
                <h4>Last Updated : ${bookInfo.updated || 'UNKNOWN'}</h4>
				<h4>Status : ${bookInfo.status || 'UNKNOWN'}</h4>
				<h4>Summary : ${bookInfo.description || 'UNKNOWN'}</h4>
				<h4>Rating : ${bookInfo.rated || 'UNKNOWN'}</h4>
                <h4>Src : <a href = 'https://m.fanfiction.net/s/${
									bookInfo.id
								}'>https://m.fanfiction.net/s/${bookInfo.id}</a></h4>
                `,
			},
			...book,
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
				console.log(uploadResult);
				socket.emit('success', {
					bookURL: uploadResult.url,
					...bookInfo,
					extension: 'epub',
				});
				fs.rm(`${__dirname}/../assets/files/${bookInfo.uid}.epub`, (err) => {
					if (err) {
						return console.log(err);
					}
				});
				return uploadResult.url;
			} catch (err) {
				console.log(err);
			}
		},
		(err) => console.error('Failed to generate Ebook because of ', err),
	);
};
