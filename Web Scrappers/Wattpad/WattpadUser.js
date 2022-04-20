const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const WattpadUser = async (id) => {
	const browser = await puppeteer.launch({ headless: false });
	const incognitoContext = await browser.createIncognitoBrowserContext();
	const page = await incognitoContext.newPage();
	let error = true;
	let errorCount = 0;
	let bookids = [];
	const getBookIds = async (page) => {
		await page.goto(`https://www.wattpad.com/user/${id}`);
		console.log(`Open Wattpad user page: https://www.wattpad.com/user/${id}`);
		const totalWorks = await page.$eval('.metadata li', (ele) =>
			Number(ele.textContent.match(/\d{1,}/)[0]),
		);
		console.log(`Total works: ${totalWorks}`);
		let isAllWorksloaded = false;
		let fetchedWorks = 0;
		while (!isAllWorksloaded) {
			console.log(bookids, fetchedWorks);
			const workids = await page.$$eval(
				'#works-item-view .title.meta.on-story-preview',
				(eles) => {
					return eles.map((el) => {
						return [el.href.split('/')[4].split('-')[0], el.textContent];
					});
				},
			);
			console.log(workids.length, 'workids.length');
			bookids = workids;
			if (fetchedWorks === workids.length) {
				isAllWorksloaded = true;
				console.log('All works loaded');
			} else {
				console.log('Fetch more works');
				fetchedWorks = workids.length;
			}
			await page.evaluate(async () => {
				await new Promise(function (resolve) {
					setTimeout(resolve, 2000);
				});
			});
			await page.click('.btn.btn-grey.on-showmore');
		}
		bookids = await page.$$eval(
			'#works-item-view .title.meta.on-story-preview',
			(eles) => {
				return eles.map((el) => {
					return [el.href.split('/')[4].split('-')[0], el.textContent.trim()];
				});
			},
		);
		return bookids;
	};
	while (error && errorCount < 5) {
		try {
			bookids = await getBookIds(page);
			error = false;
		} catch (error) {
			errorCount++;
			console.log(error);
		}
	}
	return bookids;
};
module.exports = WattpadUser;
