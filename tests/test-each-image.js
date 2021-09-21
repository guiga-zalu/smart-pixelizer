"use strict";

const	fs = require("fs").promises,
		path = require("path"),
		Jimp = require("jimp"),
		SmartPixelizer = require("./smart-pixelizer"),
		wait = ms => new Promise(res => setTimeout(res, ms)),
		
		testList = require("./test-list"),
		/* testList = [
			{ code: "manual-test", params: {
				blockSize: 96,
				times: 1e-2
			} }
		], */
		// [ image, OUT_DIR ] = ["./images/0.png", "."];
		[ image, OUT_DIR ] = process.argv.slice(2);

/**
 * Run a test in a jimp image
 * @param { Jimp } jimp 
 * @param { import("./test-list").TestParams } params 
 * @param { number } size 
 * @returns { TestResults.Data }
 */
async function runTest(jimp, params, size){
	var pixelized = { jimp: await SmartPixelizer.pixelize(jimp, params) };
	// console.log("pixelized")
	
	const distance = Jimp.distance(jimp, pixelized.jimp);
	// console.log("distance")
	
	const out_path = path.resolve(OUT_DIR, `temp-img-${
		Math.floor(Math.random() * 0x1000).toFixed(16)
	}.png`);

	await pixelized.jimp.writeAsync(out_path);
	// console.log("written")
	
	delete pixelized.jimp;
	
	const { size: out_size } = await fs.stat(out_path, { bigint: false });
	
	await fs.unlink(out_path);
	// console.log("erasen")
	
	/**
	 * @type { TestResults.Data }
	 */
	const ret = {
		resolution: `${jimp.bitmap.width}x${jimp.bitmap.height}`,
		size: [ size, out_size ],
		compression_rate: +(1 - out_size / size).toPrecision(5),
		similarity: 1 - distance,
		distance
	};
	return ret;
}

/**
 * Run all tests in one file
 * @param { string } file 
 */
async function testImage(file){
	const	jimp = await Jimp.read(file),
			{ size } = await fs.stat(file, { bigint: false });
	
	console.log("\t[%s]\tDoing %d tests.", file, testList.length);
	console.time("\t\tTests in image done in.");
	
	/**
	 * @type { TestResults[] }
	 */
	const ret = [];
	
	for(var i in testList){
		const { code, params } = testList[i];
		
		console.log("\t[%s]\tTest %d / %d", file, +i + 1, testList.length);
		console.time("\t\tTest done in");
		ret.push({
			code: code + "_image-" + file,
			testData: await runTest(jimp, params, size)
		});
		console.timeEnd("\t\tTest done in");
	}
	
	console.timeEnd("\t\tTests in image done in.");
	
	process.send(ret);
	// ret.forEach(res => console.log(res))
	await wait(100);
	process.exit(0);
}

testImage(image);

/**
 * @typedef TestResults
 * @property { string } code
 * @property { TestResults.Data } testData
 * 
 * @typedef TestResults.Data
 * @property { string } resolution
 * @property { [number, number] } size
 * @property { number } compression_rate
 * @property { number } similarity
 * @property { number } distance
 */