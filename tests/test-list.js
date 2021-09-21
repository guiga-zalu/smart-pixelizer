const n2arr = n => Array.from({ length: n });

/**
 * @type { Test[] }
 */
const testList = n2arr(4).map((_, j) =>
	n2arr(15).map((_, i) => {
		const p = {
			blockSize: i < 10
				? [ 16 * (2 * i + 1), 9 * (2 * i + 1) ]
				: 16 * (2 * (i - 10) + 1),
			times: +(10 ** (- 2 - j)).toPrecision(1),
			process: "laplace",
			compress: "resize"
		};
		const code = `bsize-${
			Array.isArray(p.blockSize)
				? p.blockSize.join("x")
				: p.blockSize + "x" + p.blockSize
		}`;
		
		return { params: p, code };
	}).concat(
		n2arr(11).map((_, i) => {
			const p = {
				cols: i < 4 ? i + 1 : (
					i < 6 ? [4, 8][i - 4] : 16 * (i - 6 + 1)
				),
				rows: i < 4 ? i + 1 : (
					i < 6 ? [3, 8][i - 4] : 9 * (i - 6 + 1)
				),
				times: +(10 ** (- 2 - j)).toPrecision(1),
				process: "laplace",
				compress: "resize"
			};
			const code = `cols-${p.cols}_rows-${p.rows}`;
			
			return { params: p, code };
		})
	)
).flat(2).map(v => {
	let { params: p } = v;
	v.code += `_times-${p.times.toExponential(0)}_process-${p.process}_compress-${p.compress}`;
	return v;
});

module.exports = testList;

/**
 * @typedef Test
 * @property { string } code
 * @property { TestParams } params
 * 
 * @typedef TestParams
 * @property { "laplace" | "sobel" } process
 * @property { Symbol } compress
 * @property { number } times
 * @property { (number | number[])? } blockSize
 * @property { number? } cols
 * @property { number? } rows
 */