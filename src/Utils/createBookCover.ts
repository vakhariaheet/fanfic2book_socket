import { createCanvas, registerFont, loadImage } from 'canvas';
import data from '../assets/bookCover.json';
import { BookInfo } from '../interfaces';

const createBookCover = async (bookInfo: BookInfo) => {
	const canvas = createCanvas(512, 800);
	const ctx = canvas.getContext('2d');
	const wordsArray = bookInfo.title.split(' ');
	let words: string[] = [];
	const wordLen = wordsArray.length;
	for (let i = 0; i < wordLen; i++) {
		words.push(wordsArray.splice(0, 3).join(' '));
		words = words.filter((word) => word);
	}
	const img = await loadImage(
		words.length <= 4
			? data.main[Math.floor(Math.random() * data.main.length)].url
			: data.other.url,
	);

	ctx.drawImage(img, 0, 0);
	ctx.textAlign = 'center';
	registerFont('./src/assets/fonts/Merienda-Regular.ttf', {
		family: 'Merienda',
	});
	ctx.globalCompositeOperation = 'destination-out';
	ctx.font = '30px Merienda';

	let height = 65.7;
	switch (words.length) {
		case 1:
			height = 127.5;
			break;
		case 2:
			height = 109.5;
			break;
		case 3:
			height = 86.7;
			break;
		case 4:
			height = 73.7;
			break;
		default:
			height = 65.7;
			break;
	}
	words.forEach((word) => {
		ctx.fillText(word, canvas.width / 2, height, 260);
		height += 40;
	});
	ctx.fillText(
		`by ${bookInfo.author}`,
		canvas.width / 2,
		canvas.height - 80,
		260,
	);
	const datauri = canvas.toDataURL();
	return datauri;
};
export default createBookCover;
