import { Book } from '../interfaces';

const { getDate } = require('./getDate');
export default async (book: Book) => {
	console.log(book.published, book.updated);
	return `<html>
	<head>
		<title>${book.title} by ${book.author}</title>
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
			}
			body {
				background: #212121;
				color: #fff;
				padding: 2rem;
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
				color: rgba(255, 255, 255, 0.6);
				font-size: var(--chapter-fontsize);
				margin-left: 1rem;
				transition: all 0.2s ease;
				text-decoration: none;
			}
			a:hover {
				color: #fff;
			}
			h2 {
				font-size: 3rem;
				margin: 1rem;
				text-align: center;
				font-family: serif;
			}
			.content {
				padding: 1rem 10vw;
			}
			.content *,.content {
				font-size: var(--chapter-fontsize);
				line-height: 2.5rem;
				margin-bottom: 0.2rem;
			}
			.hide {
				display: none !important;
			}
			button {
				display: block;
				height: 4rem;
				max-width: 20rem;
				width: 100%;
				background: #212121;
				border: 1px solid #fff;
				border-radius: 3rem;
				color: #fff;
				padding: 1rem;
				cursor: pointer;
				font-size: 1.6rem;
			}
			button:hover {
				background: #fff;
				color: #212121;
			}
			button:disabled {
				opacity: 0;
				pointer-events: none;
				cursor: 'not-allowed';
			}
			.chapterList {
				width: 80%;
				border: 1px solid #fff;
				padding: 2rem;
				margin-top: 2rem;
				max-height: 50rem;
				overflow: scroll;
				border-radius: 1rem;
			}
			.chapters {
				padding: 2rem;
				width: 100vw;
				display: flex;
				justify-content: center;
				flex-direction: column;
				align-items: center;
				transition: all 0.2s ease;
			}
			.chapterList a {
				color: rgba(255, 255, 255, 0.7);
				cursor: pointer;
				margin-bottom: 1rem;
				display: block;
			}
			.chapterList a:hover {
				color: #ffff;
			}
			.btns {
				display: flex;
				justify-content: space-between;
				padding: 0 1rem;
			}
			.btn--next,
			.btn--previous {
				height: 5rem;
				padding: 0;
				width: auto;
				border: none;
				cursor: pointer;
				opacity: 0.3;
			}
			.btn--next img,
			.btn--previous img {
				height: 100%;
				filter: invert(1);
			}
			.btn--next:hover,
			.btn--previous:hover {
				opacity: 1;
				background: #212121;
			}
			.btn--next {
				transform: rotate(90deg);
			}
			.btn--previous {
				transform: rotate(-90deg);
			}
		</style>
	</head>
	<body>
		<h1>
			<a href="${book.url}" target="_blank">${book.title}</a> by
			<a href="${book.authorUrl}" target="_blank">${book.author}</a>
		</h1>
		<div class="chapters">
			<button class="btn">Chapters</button>
			<div class="chapterList"></div>
		</div>
		${book.fandom ? `<h4>Fandom : ${book.fandom}</h4>` : ''} 
		${book.language ? `<h4>Language : ${book.language}</h4>` : ''} 
		${book.words ? `<h4>Words : ${book.words}</h4>` : ''} 
		${
			book.published
				? `<h4>Published : ${getDate(book.published, 'Do MMM YYYY')}</h4>`
				: ''
		}
		 ${
				book.updated
					? `
		<h4>Updated : ${getDate(book.updated, 'Do MMM YYYY')}</h4>
		`
					: ''
			} ${
		book.status
			? `
		<h4>Status : ${book.status}</h4>
		`
			: ''
	} ${
		book.description
			? `
		<h4>Summary : ${book.description}</h4>
		`
			: ''
	} ${
		book.rating
			? `
		<h4>Rating : ${book.rating}</h4>
		`
			: ''
	} ${
		book.chapterLength
			? `
		<h4>Chapters : ${book.chapterLength}</h4>
		`
			: ''
	}
		<div id="root"></div>
		<div class="btns">
			<button class="btn--previous">
				<img
					src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABuwAAAbsBOuzj4gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAATMSURBVHic7ZsxaxxHFMd/c8JCigPCRbAtZOHYyEWQwWkM7iI5coqgRLXAPkwqNemUJo2LVMb5CgkmX+CIkEGWrSIhtitVcRCEKBCCZFBnkKVGeil2NlrvvdnbvZ3Zu2P9YODYnXnv/f97b3bnzRsjIoQUY8xpYBa4DIwrDWBHaX8BGyKyH9S/EAQYYz4A5oEFYA4Y6VLVIbAOtIAVEdnz42FCRMRLA4aBJeBX4AgQz+0I+MXaGPbmtwfgBlgEtgOAdrVta9P0lADgFrBZAsixbd2O3wRulcHQ1RxgjJkAfgQ+zTnkD2DVPrndRHtl758DzifaJeBz4KOc+p8Ad0Xk35z9T6SLp37DOt/pyT4HvgGulPiHTQHLwG90nld2gRtBQwBoEs3MWcB/Ai6WjU3F9iTwQwciDoGmdwKAIeBBhyewBlzzDVzxZZoonLJ8eQAMeSHAgm9lGPsTmAsNXPFrBtjK8KuVh4Q8hrKe/BpwpmrwCd/GgEdZ/4RSBNiYdyn/Pu/fLDAJDeB+hp/Nrgggmu21Ce8QuNNr4Iq/tzP8db4dXMomcL/qbvcabAcSXK/IiSIErDsU3e81yBwkuMJhPRcBRJ+3moJHQKPXAHMQ0MiYGNs+m9ODDfq3/RYw1mtwBUgYQ39FbpJaQKUHLjqYm+k1qC5ImHFgWVQJIFrPa0va1V6DKUGC9sW4TSKfkOy8pHQ+AqZ7DaQEAdPoa4eluE+DE1mkXR6KyO/K9YEQ6/tD5db/WI2IxDm8V/AWIcfAhyLyT1g3w4oxZhL4m3Zs50RkL774RaoDwIuQ4I0xZ40x39p2NpQdi+FF6nKDCDNxrKzQHifLAWNzFthP2NoHZgPaW1bwrdh7nAYOlA5TFYGP25tQJBBlltL2Dix25pWbLysGnyThZiDbLxV78w2iHZu0rOoR1b0YY2aJQu29jG6jwIox5qZv++iYLjc42Z5KyrZPyznBxxKTkDfjnFc0TOMuAnZ9We0AfsO2tIwCP3smQcM0HjuRjo3rFcT8UyJSRu1v15zgJd8IXFf0b4C+arpQBfhE31GizQ2t74EPEoALiu4tgNepi8fAqarAFyCh1BYYcIr2bbjX3gnoBnyKBFc2qhQJWQR4C4Ey4FMkPM4g4TPfIeBlEvQBPqFrxDcJOCbBBlE5SlrOK9ecYoyZIvtVNy8ib/LqE5FDosXKY+X2CNAyxlwt4iM6ph0vBAB38QQ+FkvCl7hJ+LqgykIEXCqofFi51jX4WBIkrCm3Jwuq0zDtgIfFEFEhw15i/DoFYj7nnJBOdS8U1KEuhsDTchh4H/gK+NgXcMXGJ8B3wNWC49zLYduh0oRI1Y2MhEicBmsp8bHgCqYBFA1LC94lRaOkqEQVmM9SYxvAvSqcDCz3aE/4PpO46jQRJ7XcGEl2rvfWmB1Q381RO6je2+N2cH0LJBJK6lsiY5XUu0jKKhu0Mrk7Gf4WK5NLKG06GBX6p1ByyPri8rOZOT6HgX4ulT1jfXD5V65UNsFwPxZLz1nbLr/8FEsnSOiXcvlrHZ664LNcPmW86Zho4hbywMRFqzvrjFGYAxMpR6o8MnPF6njeAXj8qit8ZObdoamSf8uBPzbnIzbre3AyRcRAHp2t/eHpIAS8ZaDPj8//BxAE0iU0J75YAAAAAElFTkSuQmCC"
					alt=""
				/></button
			><button class="btn--next">
				<img
					src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABuwAAAbsBOuzj4gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAATMSURBVHic7ZsxaxxHFMd/c8JCigPCRbAtZOHYyEWQwWkM7iI5coqgRLXAPkwqNemUJo2LVMb5CgkmX+CIkEGWrSIhtitVcRCEKBCCZFBnkKVGeil2NlrvvdnbvZ3Zu2P9YODYnXnv/f97b3bnzRsjIoQUY8xpYBa4DIwrDWBHaX8BGyKyH9S/EAQYYz4A5oEFYA4Y6VLVIbAOtIAVEdnz42FCRMRLA4aBJeBX4AgQz+0I+MXaGPbmtwfgBlgEtgOAdrVta9P0lADgFrBZAsixbd2O3wRulcHQ1RxgjJkAfgQ+zTnkD2DVPrndRHtl758DzifaJeBz4KOc+p8Ad0Xk35z9T6SLp37DOt/pyT4HvgGulPiHTQHLwG90nld2gRtBQwBoEs3MWcB/Ai6WjU3F9iTwQwciDoGmdwKAIeBBhyewBlzzDVzxZZoonLJ8eQAMeSHAgm9lGPsTmAsNXPFrBtjK8KuVh4Q8hrKe/BpwpmrwCd/GgEdZ/4RSBNiYdyn/Pu/fLDAJDeB+hp/Nrgggmu21Ce8QuNNr4Iq/tzP8db4dXMomcL/qbvcabAcSXK/IiSIErDsU3e81yBwkuMJhPRcBRJ+3moJHQKPXAHMQ0MiYGNs+m9ODDfq3/RYw1mtwBUgYQ39FbpJaQKUHLjqYm+k1qC5ImHFgWVQJIFrPa0va1V6DKUGC9sW4TSKfkOy8pHQ+AqZ7DaQEAdPoa4eluE+DE1mkXR6KyO/K9YEQ6/tD5db/WI2IxDm8V/AWIcfAhyLyT1g3w4oxZhL4m3Zs50RkL774RaoDwIuQ4I0xZ40x39p2NpQdi+FF6nKDCDNxrKzQHifLAWNzFthP2NoHZgPaW1bwrdh7nAYOlA5TFYGP25tQJBBlltL2Dix25pWbLysGnyThZiDbLxV78w2iHZu0rOoR1b0YY2aJQu29jG6jwIox5qZv++iYLjc42Z5KyrZPyznBxxKTkDfjnFc0TOMuAnZ9We0AfsO2tIwCP3smQcM0HjuRjo3rFcT8UyJSRu1v15zgJd8IXFf0b4C+arpQBfhE31GizQ2t74EPEoALiu4tgNepi8fAqarAFyCh1BYYcIr2bbjX3gnoBnyKBFc2qhQJWQR4C4Ey4FMkPM4g4TPfIeBlEvQBPqFrxDcJOCbBBlE5SlrOK9ecYoyZIvtVNy8ib/LqE5FDosXKY+X2CNAyxlwt4iM6ph0vBAB38QQ+FkvCl7hJ+LqgykIEXCqofFi51jX4WBIkrCm3Jwuq0zDtgIfFEFEhw15i/DoFYj7nnJBOdS8U1KEuhsDTchh4H/gK+NgXcMXGJ8B3wNWC49zLYduh0oRI1Y2MhEicBmsp8bHgCqYBFA1LC94lRaOkqEQVmM9SYxvAvSqcDCz3aE/4PpO46jQRJ7XcGEl2rvfWmB1Q381RO6je2+N2cH0LJBJK6lsiY5XUu0jKKhu0Mrk7Gf4WK5NLKG06GBX6p1ByyPri8rOZOT6HgX4ulT1jfXD5V65UNsFwPxZLz1nbLr/8FEsnSOiXcvlrHZ664LNcPmW86Zho4hbywMRFqzvrjFGYAxMpR6o8MnPF6njeAXj8qit8ZObdoamSf8uBPzbnIzbre3AyRcRAHp2t/eHpIAS8ZaDPj8//BxAE0iU0J75YAAAAAElFTkSuQmCC"
					alt=""
				/>
			</button>
		</div>
		<script>
			const data=${JSON.stringify(
				book,
			)},rootEle=document.querySelector("#root"),btnNext=document.querySelector(".btn--next"),btnPrevios=document.querySelector(".btn--previous"),h2=document.querySelector(".content"),chapters=document.querySelector(".chapters"),chapterList=document.querySelector(".chapterList"),btn=document.querySelector(".btn");let nextRoute=data.chapter===1?null:"#2",previousRoute=null;1===data.chapters.length&&(nextRoute=null),btn.addEventListener("click",()=>{chapterList.classList.toggle("hide")});const onNavigate=e=>{history.pushState({},e,window.location.pathname+e),rootEle.innerHTML=routes[e],nextRoute=Number(e.replace("#",""))+1>Number(data.chapters)?null:"#"+(Number(e.replace("#",""))+1),btnNext.disabled=null===nextRoute,previousRoute=Number(e.replace("#",""))-1<=0?null:"#"+(Number(e.replace("#",""))-1),btnPrevios.disabled=null===previousRoute,chapterList.classList.add("hide"),window.scroll(0,0)},routes={};data.chapters.forEach((e,t)=>{routes["#"+(t+1)]="<h2>"+e.title+'</h2> <div class="content">'+e.content+"</div>"}),onNavigate("#1"),chapterList.innerHTML=data.chapters.map((e,t)=>'<a class="link">'+e.title+"</a>").join("");const links=document.querySelectorAll(".link");console.log(links),links.forEach((e,t)=>{e.addEventListener("click",()=>{onNavigate("#"+(t+1))})}),window.onpopstate=(()=>{console.log(window.location.pathname),rootEle.innerHTML=routes[window.location.hash]}),btnNext.addEventListener("click",()=>{onNavigate(nextRoute)}),btnPrevios.addEventListener("click",()=>{onNavigate(previousRoute)});
		</script>
	</body>
</html>
`;
};
