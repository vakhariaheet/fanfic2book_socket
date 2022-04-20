const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
module.exports = async (userid) => {
	const browser = await puppeteer.launch();

	let error = true;
	let errorCount = 0;
	let userLinks = [];
	const getBookids = async () => {
		const page = await browser.newPage();
		await page.goto(`https://www.fanfiction.net/u/${userid}`);
		await page.waitForSelector('.mystories .stitle');
		const userLinks = await page.$$eval('.mystories .stitle', (ele) => {
			return ele.map((el) => [el.href.split('/')[4], el.textContent]);
		});
		return userLinks;
	};
	while (error && errorCount < 3) {
		try {
			userLinks = await getBookids();
			error = false;
		} catch (error) {
			errorCount++;
			socket.emit('log', {
				message: 'Error getting bookids',
			});
			socket.emit('log', {
				message: 'Retrying',
			});
			break;
		}
	}
	return userLinks;
};
