const http = require('http').createServer();
const Nightmare = require('nightmare');
const io = require('socket.io')(http, {
	cors: {
		origins: ['http://localhost:3001', 'https://fanfic2book.vercel.app/'],
	},
});
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
cloudinary.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.API_KEY,
	api_secret: process.env.API_SECRET,
});
const FanFiction = require('./Utils/FanFiction');

io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on('getbook', (data) => {
		const { site, extension, url } = data;
		console.log(data);
		socket.emit('log', {
			message: 'Fetching book',
			type: 'single',
		});
		if (site === 'fanfiction') {
			FanFiction(url, extension, socket, cloudinary);
		}
	});
	socket.on('epub_link_created', (data) => {
		cloudinary.uploader.destroy(
			`temp/${data.id}.epub`,
			{ resource_type: 'raw' },
			function (error, result) {
				if (error) return error;
				socket.emit('log', {
					message: result,
				});
			},
		);
	});
});

//Nightmare({
//    show:true,
//    openDevTools:{detach:true}
//}).goto("https://npmjs.org/epub-gen").then(() =>{})
const port = process.env.PORT || 3000;
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
