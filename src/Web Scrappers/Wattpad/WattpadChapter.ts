import { Socket } from 'socket.io';
import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
export default async (id: string, socket: Socket): Promise<string> => {
	socket.emit('log', {
		message: 'Scrapping Wattpad Book ID from chapter ID',
	});
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page.goto(`https://www.wattpad.com/${id}`);
	const bookid = await page.$eval(
		'.toc-header a.on-navigate',
		(ele: any) => ele.href.split('/')[4].split('-')[0],
	);
	socket.emit('log', {
		message: 'BookID fetched',
	});
	return bookid;
};
