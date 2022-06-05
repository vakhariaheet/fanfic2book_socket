import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const AO3Series = async (id: string) => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	let error = true;
	let errorCount = 0;
	let bookids = [];
	const getBookIds = async (page: Page) => {
		await page.goto(`https://archiveofourown.org/series/${id}`);
		const bookids = await page.$$eval(
			".work.blurb .header h4.heading a:not([rel='author']):first-of-type",
			(eles: Element[]) => {
				return eles.map((el: any) => {
					const bookid = el.href.split('/')[4];
					if (bookid.includes('?')) return bookid.split('?')[0];
					return [bookid, el.textContent];
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
export default AO3Series;
