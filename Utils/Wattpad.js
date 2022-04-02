const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, openDevTools: { detach: true } });
const fs = require('fs');

nightmare
	.goto('http://www.wattpad.com/1160876741-taekook-behind-the-scene-chapter-93')
	.scrollTo(10000, 0)
	.wait(200)
	.evaluate(() => {
		const pages = [...document.querySelectorAll('.panel-reading pre')];
		console.log(pages);
		const lines = [];
		pages.forEach((page) => {
			const linesArr = page.textContent.split('+');
			console.log(linesArr);
			lines.push(linesArr.map((line) => line.trim()).join('\n'));
			return linesArr;
		});
		console.log(lines);
		return lines;
	})

	.then((e) => {
		fs.writeFile('Chapter 1.txt', e.join('\n'), (err) => {
			if (err) return console.log(err);
			return console.log('Sucess');
		});
	});
