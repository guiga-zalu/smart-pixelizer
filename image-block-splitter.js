"use strict";

const ImageBlockSplitter = {
	/**
	 * Splits a Jimp instance into IMGDataBlock instances
	 * 
	 * @param { Jimp } jimp
	 * @param { { blockSize: number | number[2] } | { cols: number, rows: number } } params
	 * @returns { IMGDataBlockBlock } Blocos
	 */
	splitJimp(jimp, params = {}){
		return ImageBlockSplitter.splitBitmap(jimp.bitmap, params);
	},
	/**
	 * Splits a IMGDataBlock compatible into IMGDataBlock instances
	 * 
	 * @param { IMGDataBlock } bitmap
	 * @param { { blockSize: number | number[2] } | { cols: number, rows: number } } [params = {}]
	 * @returns { IMGDataBlockBlock } Blocos
	 */
	splitBitmap(bitmap, params = {}){
		const	{ width, height } = bitmap,
				data = Array.from(bitmap.data);
		
		var { blockSize, cols, rows } = params;
		
		var blockWidth, blockHeight;
		
		cols |= 0;
		rows |= 0;
		if(cols && rows){
			blockWidth = Math.floor(width / cols);
			blockHeight = Math.floor(height / rows);
		}else{
			blockSize = blockSize || 96;
			
			if(!Array.isArray(blockSize))
				blockWidth = blockHeight = blockSize | 0;
			else
				[ blockWidth, blockHeight ] = [ blockSize[0] | 0, blockSize[1] | 0 ];
			
			cols = Math.ceil(width / blockWidth);
			rows = Math.ceil(height / blockHeight);
		}
		
		/**
		   Todos os blocos
		 * @type { IMGDataBlockBlock }
		 */
		const	blocks = [],
				w2 = width << 2;
		
		blocks.rows = rows;
		blocks.cols = cols;
		
			/**
			 * @type { number[] }
			 */
		var	arr,
			/**
			 * Bloco
			 * @type { IMGDataBlock }
			 */
			block,
			row, col, x, y, idx,
			bwidth, bheight;
		
		for(row = 0; row < rows; row++)
			for(col = 0; col < cols; col++){
				x = col * blockWidth;
				y = row * blockHeight;
				
				arr = [];
				
				bwidth	= Math.min(blockWidth, width - x);
				bheight	= Math.min(blockHeight, height - y);
				
				if(!blocks[row])
					blocks[row] = [];
				
				block = blocks[row][col] = {
					x, y,
					width: bwidth,
					height: bheight,
				};
				
				idx = (y * width + x) << 2;
				
				bwidth <<= 2;
				for(var $y = 0; $y < bheight; $y++){
					arr[$y] = data.slice( idx, idx + bwidth );
					idx += w2;
				}
				
				block.data = Buffer.from(arr.flat());
			}
		
		return blocks;
	}
};

module.exports = ImageBlockSplitter;

/**
 * @typedef IMGDataBlock
 * @property { number } width
 * @property { number } height
 * @property { Buffer | number[] } data
 * @property { number? } x
 * @property { number? } y
 */
/**
 * @typedef IMGDataBlockBlock
 * @property { IMGDataBlock[][] } this
 * @property { number } cols
 * @property { number } rows
 */