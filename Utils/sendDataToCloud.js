const fs = require('fs');

module.exports = async (bookData, book, cloudinary) => {
	let file =
		`module.exports={` +
		Object.keys(bookData)
			.map((key) => {
				return `${key}:\`${bookData[key]}\`,`;
			})
			.join('') +
		`book:[` +
		book
			.map((v) => {
				return `{title: \`${v.title}\`,data:\`${v.data}\`}`;
			})
			.join(',') +
		`]}`;
	await fs.writeFileSync(`${bookData.uid}.js`, file);
	const buffer = await fs.readFileSync(`${bookData.uid}.js`);
	cloudinary.uploader
		.upload_stream(
			{
				resource_type: 'raw',
				folder: 'bookData',
				format: 'js',
				public_id: `${bookData.uid}.js`,
			},
			(err, result) => {
				if (err) {
					return console.log(err);
				}
				fs.rm(`${bookData.uid}.js`, (err) => {
					if (err) {
						return console.log(err);
					}
				});
			},
		)
		.end(buffer);
};
