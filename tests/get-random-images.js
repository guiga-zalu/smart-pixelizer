const Jimp = require("jimp");

async function getRandomImages(qtd = 1, size = null, folder = "./images"){
	var str = size && Array.isArray(size) ? `/${size[0]}x${size[1]}` : "";
	str = "https://source.unsplash.com/random" + str;
	
	console.log("Url: { %s }", str);
	
	for(var i = 0; i < qtd; i++){
		console.log("Reading img [%d]", i);
		let jimp = await Jimp.read(str);
		console.log("Writing img [%d]", i);
		await jimp.writeAsync(`${folder}/${i}.png`);
	}
}

module.exports = getRandomImages;