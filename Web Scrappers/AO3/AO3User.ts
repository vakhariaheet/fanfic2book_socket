import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const AO3User = async (id: string) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	let error = true;
	let errorCount = 0;
	let bookids: string[] = [];
	const getBookIds = async (page: Page) => {
		await page.goto(`https://archiveofourown.org/users/${id}/works`);
		const totalWorks = await page.$eval('.current', (ele: any) =>
			Number(ele.textContent.split('(')[1].split(')')[0]),
		);
		const pagesReOf20 = totalWorks % 20;
		const pages =
			pagesReOf20 === 0
				? (totalWorks - pagesReOf20) / 20
				: (totalWorks - pagesReOf20) / 20 + 1;
		for (let i = 1; i <= pages; i++) {
			await page.goto(
				`https://archiveofourown.org/users/${id}/works?page=${i}`,
			);
			const workids = await page.$$eval(
				".work.blurb .header h4.heading a:not([rel='author']):first-of-type",
				(eles) => {
					return eles.map((el: any) => {
						const bookid = el.href.split('/')[4];
						if (bookid.includes('?')) return bookid.split('?')[0];
						return [bookid, el.textContent];
					});
				},
			);
			bookids = bookids.concat(workids);
		}
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
export default AO3User;
