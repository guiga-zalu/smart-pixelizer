const	cp = require("child_process"),
		fs = require("fs").promises,
		wait = ms => new Promise(res => setTimeout(res, ms));

async function run(){

const	TMP_OUTPUT = await fs.mkdtemp("./tmp-"),
		images = (
			await fs.readdir("./images")
		).filter(f => f.endsWith(".png")),
		// .slice(0, 10),
		/**
		 * @type { TestResults[] }
		 */
		results = [];

var índice = 0;

async function partialSave(){
	const toSave = [];
	do toSave.push(results.shift()); while(results.length);
	
	await fs.writeFile(
		`./test-results-until-${índice}.json`,
		JSON.stringify(toSave),
		{ encoding: "utf8" }
	);
}

/**
 * 
 * @async
 * @param { string } image 
 * @returns { Promise<{ testResults: TestResults[], fork: import("child_process").ChildProcess }> }
 */
async function processImage(image){
	return new Promise(res => {
		/**
		 * @type { import("child_process").ChildProcess }
		 */
		var fork = cp.fork(
			`${__dirname}/test-each-image.js`,
			[`./images/${image}`, TMP_OUTPUT],
			{ serialization: "json" }
		).on("message", msg => {
			res({
				/**
				 * @type { TestResults[] }
				 */
				testResults: msg,
				fork
			});
		});
	});
}

function processNextImage(){
	var image = images[índice++];
	console.log("\t[%s]\tInitializing image", image);
	// return processImage(images.shift()).then(res => {
	return processImage(image).then(async ({ testResults, fork }) => {
		await wait(200);
		
		if(!fork?.killed)
			fork?.kill();
		
		do results.push(testResults.shift()); while(testResults.length);
		
		console.log(
			"\t[%s]\tImage done.\n\t%d remaining.",
			image, images.length - índice
		);
		
		await wait(500);
		
		if(índice % 5 === 0)
			await partialSave();
		
		// return images.length ? processNextImage() : true;
		return índice < images.length ? processNextImage() : true;
	});
}
try{
	const promises = [
		processNextImage(),
		processNextImage()
	];
	await Promise.all(promises);
}catch(e){
	console.error(e);
}finally{
	await partialSave();
	await fs.rmdir(TMP_OUTPUT, {
		retryDelay: 1e2,
		maxRetries: 5
	});
}

}

run();

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