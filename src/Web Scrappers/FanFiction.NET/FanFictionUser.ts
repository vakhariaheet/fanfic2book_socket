import moment from 'moment';
import puppeteer from 'puppeteer-extra';
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Socket } from 'socket.io';
import { User } from '../../interfaces';
import { SendEmail, templates } from '../../Utils/SendEmail';

puppeteer.use(StealthPlugin());
export default async (userid: string, socket: Socket, user: User) => {
	console.log(`Scraping FanFiction.net for user ${userid}`);
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	let error = true;
	let errorCount = 0;
	let errorMessage = '';
	let userLinks: string[][] = [];
	const getBookids = async () => {
		const page = await browser.newPage();
		await page.goto(`https://www.fanfiction.net/u/${userid}`);
		await page.waitForSelector('.mystories .stitle');
		const userLinks = await page.$$eval('.mystories .stitle', (ele) => {
			return ele.map((el: any) => [el.href.split('/')[4], el.textContent]);
		});
		await page.close();
		await browser.close();
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
			errorMessage = JSON.stringify(error);
		}
	}
	if (errorCount === 3) {
		SendEmail('heetkv@gmail.com', {
			type: templates.userError,
			book: `Error scraping FanFiction.net for user ${userid}`,
			error: {
				message: errorMessage,
				site: 'Fanfiction',
				time: moment().format('MMMM Do YYYY, h:mm:ss a'),
			},
			user,
		});
		return {
			error: true,
		};
	}

	return userLinks;
};
