const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, openDevTools: { detach: true } });
const fromA03 = async (extension, bookURL) => {
	let url = await nightmare
		.goto(bookURL)
		.evaluate(() => {
			document.querySelector('#main .actions li a').click();
		})
		.evaluate(() => {
			const urlArr = [
				...document.querySelectorAll(
					'#main > div.work > ul > li.download > ul > li a',
				),
			].map((url) => url.href)[4];
			console.log(urlArr);
			return urlArr;
		});
	console.log(url);
	// url = url.replace('html', extension);
	return url;
};
module.exports = fromA03;
