const data = require('./F-2397633');
const puppeteer = require('puppeteer');
(async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
        <style>

			*,
			::after,
			::before {
				margin: 0;
				padding: 0;
				font-size: 10px;
				font-weight: 100;
				font-family: sans-serif;
			}
			:root {
				--chapter-fontsize: 2rem;
			}
			body::-webkit-scrollbar {
				width: 1em;
			}
			body::-webkit-scrollbar-track {
				box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
				border-radius: 2rem;
			}
			body::-webkit-scrollbar-thumb {
				background-color: #6c63ff;
				outline: 1px solid #6c63ff;
				border-radius: 2rem;
			}
			*::selection {
				color: white;
				background: #6c63ff;
			}
			html {
				scroll-behavior: smooth;
				width: 100vw;
				overflow-x: hidden;
				height: 100%;
            -webkit-print-color-adjust: exact;
               

			}
			body {
				
				color: #212121;
			
			}
			h1,
			h1 a {
				font-size: 5rem;
				text-align: center;
				font-weight: 400;
				margin-bottom: 1rem;
				font-family: sans-serif;
			}
			h4 {
				font-size: var(--chapter-fontsize);
				line-height: 2.5rem;
			}
			a {
				color: rgba(33,33,33, 0.6);
				font-size: var(--chapter-fontsize);
				margin-left: 1rem;
				transition: all 0.2s ease;
				text-decoration: none;
			}
			a:hover {
				color: #212121;
			}
			h2 {
				font-size: 3rem;
				margin: 1rem;
				text-align: center;
				font-family: serif;
                margin-bottom: 3rem;
			}
			.content *,.content {
				font-size: var(--chapter-fontsize);
				line-height: 2.5rem;
				margin-bottom: 0.2rem;
			}
            .content {
                padding: 0 3rem;
            }
		</style>
    </head>
    <body>
    ${data.book
			.map(
				(chapter) => `
            <h2>${chapter.title}</h2>
            <div class="content" >${chapter.data}</div>
        `,
			)
			.join('\n')}
    </body>
    </html>

    `;
	await page.setContent(html);
	await page.pdf({
		path: './test.pdf',
		format: 'A4',
		printBackground: true,
		margin: { top: '30px', bottom: '30px', left: '10px', right: '10px' },
	});
	console.log(html);
})();
