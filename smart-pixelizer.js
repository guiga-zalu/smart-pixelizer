"use strict";

const	Jimp = require("jimp"),
		ImageBlockSplitter = require("./image-block-splitter"),
		zero = () => 0,
		zeroFilled = n => Array.from({ length: n }, zero);

const Compressor = {
	/**
	 * 
	 * @param { Jimp } block 
	 * @param { number } density 
	 * @param { ?number } [stabilitySize = 2]
	 * @returns { Jimp }
	 */
	stableBlockResizer(block, density, stabilitySize = 2, stabilityLog = Math.LOG2E){
		const	{ width, height } = block.bitmap;//,
				// stabilityLog = Math.log(stabilitySize);
		
		// blocos = n *** (- chão(log_n(densidade)))
		// blocos = exp(- chão(log_n(densidade)) log n)
		let blocos = Math.exp(- Math.floor(Math.log(density) / stabilityLog) * stabilityLog);
		try{
			return block
				.resize(Math.max(1, width / blocos), Math.max(1, height / blocos))
				.resize(width, height, Jimp.RESIZE_NEAREST_NEIGHBOR);
		}catch(e){
			throw new Error(
				`#block = (${width}; ${height});
	density = ${density};
	stabilitySize = ${stabilitySize};
	blocos = ${blocos}`
			);
		}
	},
	/**
	 * 
	 * @param { Jimp } block 
	 * @param { number } density 
	 * @returns { Jimp }
	 */
	blockResizer(block, density){
		// density = density || .5;
		const { width, height } = block.bitmap;
		try{
			return block
				.resize(Math.max(1, width * density), Math.max(1, height * density))
				.resize(width, height, Jimp.RESIZE_NEAREST_NEIGHBOR);
		}catch(e){
			throw new Error(`#block = (${width}; ${height}); density = ${density}`);
		}
	},
	/**
	 * 
	 * @param { Jimp } block 
	 * @param { number } density 
	 * @returns { Jimp }
	 */
	dct(jimp, toPreserve){
		var data = require("./dct-compresser").compressJimp(jimp, toPreserve);
		const ret = new Jimp(jimp.bitmap.width, jimp.bitmap.height);
		ret.data = Buffer.from(data.flat());
		return ret;
	}
};
const Convolutor = {
	/**
	 * 
	 * @param { "laplace" | "sobel" } [fn = "laplace"]
	 * @param { IMGDataBlock } bitmap 
	 * @param { IMGDataBlockBlock } blocks 
	 * @returns { number[][] }
	 */
	run(fn = "laplace", bitmap, blocks){
		const	{ width, height, data } = bitmap,
				{ cols, rows } = blocks,
				filtro = zeroFilled(data.length >> 2),
				somas = Array.from({ length: rows }, () => zeroFilled(cols)),
				func = Convolutor[fn];
			
		var	x, y;
		
		// * Calcula o filtro
		
		var idx;
		// Para cada píxel
		for(x = 0; x < width; x++)
			for(y = 0; y < height; y++){
				idx = y * width + x;
				filtro[idx] = func(x, y, idx << 2, bitmap);
			}
		
		// * Soma os valores por bloco
		
		var soma;
		// Para cada bloco
		for(var by = 0, bx; by < rows; by++)
			for(bx = 0; bx < cols; bx++){
				const	bloco = blocks[by][bx],
						{ x: x_min, y: y_min, width: bw, height: bh } = bloco,
						x_max = x_min + bw,
						y_max = y_min + bh;
				
				soma = 0;
				for(y = y_min; y < y_max; y++)
					for(x = x_min; x < x_max; x++)
						soma += filtro[y * width + x];
				
				somas[by][bx] = soma / (bw * bh);
			}
		
		return somas;
	},
	/**
	 * 
	 * @param { number } x
	 * @param { number } y
	 * @param { number } idx
	 * @param { IMGDataBlock } bitmap Bloco
	 * @returns { number }
	 */
	laplace(x, y, idx, bitmap){
		const	{ width, height, data } = bitmap,
				w2 = width << 2;
		
		var laplace = 0, count = 0;
		if(y > 0){
			laplace += 2 * SmartPixelizer.getLevel(data, idx - w2);
			count++;
			if(x > 0){
				laplace += SmartPixelizer.getLevel(data, idx - w2 - 4);
				count++;
			}
			if(x < width - 1){
				laplace += SmartPixelizer.getLevel(data, idx - w2 + 4);
				count++;
			}
		}
		if(y < height - 1){
			laplace += 2 * SmartPixelizer.getLevel(data, idx + w2);
			count++;
			if(x > 0){
				laplace += SmartPixelizer.getLevel(data, idx + w2 - 4);
				count++;
			}
			if(x < width - 1){
				laplace += SmartPixelizer.getLevel(data, idx + w2 + 4);
				count++;
			}
		}
		if(x > 0){
			laplace += 2 * SmartPixelizer.getLevel(data, idx - 4);
			count++;
		}
		if(x < width - 1){
			laplace += 2 * SmartPixelizer.getLevel(data, idx + 4);
			count++;
		}
		
		return Math.abs(SmartPixelizer.getLevel(data, idx) - laplace / count);
	},
	/**
	 * 
	 * @param { number } x
	 * @param { number } y
	 * @param { number } idx
	 * @param { IMGDataBlock } bitmap Bloco
	 * @returns { number }
	 */
	sobel(x, y, idx, bitmap){
		const	{ width, height, data } = bitmap,
				w2 = width << 2;
		
		/* 
		 - x = [
		 -	- 1; 0; + 1
		 -	- 2; 0; + 2
		 -	- 1; 0; + 1
		 - ]
		 - y = [
		 -	- 1; - 2; - 1
		 -	 0 ;  0 ;  0 
		 -	+ 1; + 2; + 1
		 - ]
		 */
		
		var	count_x, count_y,
			sobel_x, sobel_y,
			level;
		
		count_x = count_y = 0;
		sobel_x = sobel_y = 0;
		if(y > 0){
			sobel_y -= 2 * SmartPixelizer.getLevel(data, idx - w2);
			count_y += 2;
			if(x > 0){
				level = SmartPixelizer.getLevel(data, idx - w2 - 4);
				sobel_x -= level;
				sobel_y -= level;
				count_x++; count_y++;
			}
			if(x < width - 1){
				level = SmartPixelizer.getLevel(data, idx - w2 + 4);
				sobel_x += level;
				sobel_y -= level;
				count_x++; count_y++;
			}
		}
		if(y < height - 1){
			sobel_y += 2 * SmartPixelizer.getLevel(data, idx + w2);
			count_y += 2;
			if(x > 0){
				level = SmartPixelizer.getLevel(data, idx + w2 - 4);
				sobel_x -= level;
				sobel_y += level;
				count_x++; count_y++;
			}
			if(x < width - 1){
				level = SmartPixelizer.getLevel(data, idx + w2 + 4);
				sobel_x += level;
				sobel_y += level;
				count_x++; count_y++;
			}
		}
		if(x > 0){
			sobel_x -= 2 * SmartPixelizer.getLevel(data, idx - 4);
			count_x += 2;
		}
		if(x < width - 1){
			sobel_x += 2 * SmartPixelizer.getLevel(data, idx + 4);
			count_x += 2;
		}
		
		return Math.hypot(sobel_x / count_x, sobel_y / count_y);
	}
};

const SmartPixelizer = {
	/**
	 * Pixeliza uma imagem
	 * @async
	 * @param { JimpConstructable } jimp Imagem Jimp
	 * @param { SmartPixelizer_params } [params = {}] Parâmetros
	 * @returns { Jimp } Imagem pixelizada
	 * @memberof SmartPixelizer
	 */
	pixelize(jimp, params = {}){
		if(!(jimp instanceof Jimp))
			return Jimp.read(jimp).then(img => SmartPixelizer.pixelize(img, params));
		
		const { width, height } = jimp.bitmap;
		
		params = {
			blockSize: 96,
			times: 1,
			process: SmartPixelizer.PROCESS_LAPLACE,
			compress: SmartPixelizer.COMPRESS_RESIZE,
			...params
		};
		
		/* if(
			params.compress === SmartPixelizer.COMPRESS_JPEG
			&& typeof params.blockSize !== "number"
			&& !(Array.isArray(params.blockSize) && params.blockSize[0] === params.blockSize[1])
		)
			params.compress = SmartPixelizer.COMPRESS_RESIZE; */
		if(params.compress === SmartPixelizer.COMPRESS_JPEG)
			params.blockSize = 8;
		
		params.times *= SmartPixelizer.BASE_MULTIPLIER;
		if("stabilitySize" in params)
			params.stabilityLog = Math.log(params.stabilitySize);
		
		const	blocos = ImageBlockSplitter.splitBitmap(jimp.bitmap, params),
				mapa_de_densidade = SmartPixelizer.imageDensity(jimp.bitmap, blocos, params),
				{ cols, rows } = blocos;
		
		var retorno = new Jimp(width, height, 0xffffffff);
		
		const { densityMap } = params;
		// console.log(mapa_de_densidade)
		for(var x, y = rows - 1; y >= 0; y--)
			for(x = cols - 1; x >= 0; x--)
				retorno = SmartPixelizer.applyDensityMap(
					retorno,
					blocos[y][x],
					densityMap(mapa_de_densidade[y][x]),
					params
				);
		
		return retorno;
	},
	/**
	 * @param { IMGDataBlock } bitmap
	 * @param { IMGDataBlockBlock } blocks
	 * @param { SmartPixelizer_params } params
	 * @returns { number[][] } Densidade
	 * @memberof SmartPixelizer
	 */
	imageDensity(bitmap, blocks, params){
		const { times } = params;
		
		const fn = params.process === SmartPixelizer.PROCESS_LAPLACE
			? "laplace"
			: "sobel";
		
		return Convolutor.run(fn, bitmap, blocks).map(s => s.map(v => v * times));
	},
	/**
	 * @param { Jimp } jimp
	 * @param { IMGDataBlock } block
	 * @param { number } density
	 * @param { SmartPixelizer_params } params
	 * @returns { Jimp }
	 * @memberof SmartPixelizer
	 */
	applyDensityMap(jimp, block, density, params){
		var { x, y, width, height } = block;
		// console.log(density)
		density = Math.min(Math.max(density, 0), 1);
		
		// console.log(`x; y: ${x}; ${y}\tw; h: ${width}; ${height}\tdensity: ${density}`);
		
		var $block = { jimp: new Jimp(width, height) };
		
		// if(!($block.jimp instanceof Jimp))
		//	console.log($block.jimp);
		
		$block.jimp.bitmap.data = block.data;
		
		switch(params.compress){
			case SmartPixelizer.COMPRESS_JPEG:
				$block.jimp = Compressor.dct($block.jimp, density); break;
			case SmartPixelizer.COMPRESS_STABLE_RESIZE:
				$block.jimp = Compressor.stableBlockResizer(
					$block.jimp, density, params.stabilitySize, params.stabilityLog
				); break;
			case SmartPixelizer.COMPRESS_RESIZE:
			default:
				$block.jimp = Compressor.blockResizer($block.jimp, density); break;
		}
		
		// $block.write(`../public/imgs/${x}-${y}-e.png`)
		
		var ret = jimp.composite(
			$block.jimp,
			x, y,
			{
				mode: Jimp.BLEND_SOURCE_OVER,
				opacityDest: 1,
				opacitySource: 1
			}
		);
		delete $block.jimp;
		return ret;
	},
	/**
	 * @param { number[] | ArrayBufferView | Buffer | Uint8ClampedArray } data
	 * @param { number } idx
	 * @returns { number }
	 * @memberof SmartPixelizer
	 */
	getLevel(data, idx){
		return .2126 * data[idx] + .7152 * data[idx + 1] + .0722 * data[idx + 2];
	},
	
	PROCESS_SOBEL:		Symbol("sobel"),
	PROCESS_LAPLACE:	Symbol("laplace"),
	
	COMPRESS_RESIZE:		Symbol("block-resize"),
	COMPRESS_STABLE_RESIZE:	Symbol("stable-block-resize"),
	// Ainda não funciona.
	COMPRESS_JPEG:			Symbol("jpeg"),
	
	// Número arbitrário.
	// Era 0.003. Foi arredondado para dar sorte.
	BASE_MULTIPLIER: 0.01
};

// export default SmartPixelizer;
module.exports = SmartPixelizer;

/**
 * @typedef IMGDataBlock
 * @property { number } width
 * @property { number } height
 * @property { Buffer } data
 * @property { number } x
 * @property { number } y
 */
/**
 * @typedef IMGDataBlockBlock
 * @property { IMGDataBlock[][] } this
 * @property { number } cols
 * @property { number } rows
 */
/**
 * @typedef { number | number[] } numbery
 */
/**
 * @typedef SmartPixelizer_params
 * @property { ?numbery } [blockSize = 96]
 * @property { ?number } [times = 1]
 * @property { ?number } cols
 * @property { ?number } rows
 * @property { symbol } [process = SmartPixelizer.PROCESS_LAPLACE]
 * @property { symbol } [compress = SmartPixelizer.COMPRESS_RESIZE]
 * @property { ?number } stabilitySize
 * @property { (x: number) => number } densityMap	- Maps [0; 1] to [0; 1]
 */
/**
 * @typedef { string | import("jimp") | Buffer | ImageBitmap } JimpConstructable
 */
