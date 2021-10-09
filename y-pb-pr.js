/**
 * @class YCbCr
 */
class YCbCr{
	/**
	 * @param { number } [Kr = 0.299]
	 * @param { number } [Kg = 0.587]
	 * @param { number } [Kb = 0.114]
	 * @memberof YCbCr
	 */
	constructor(Kr = 0.299, Kg = 0.587, Kb = 0.114){
		var sum = Kr + Kg + Kb;
		Kr /= sum, Kg /= sum, Kb /= sum;
		this.Kr = Kr, this.Kg = Kg, this.Kb = Kb;
		this._Kr = 2 * (1 - Kr), this._Kb = 2 * (1 - Kb);
		this.over_Kr = 1 / this._Kr, this.over_Kb = 1 / this._Kb;
		this.Kr_Kr = this._Kr * Kr, this.Kb_Kb = this._Kb * Kb;
		
		this.minY = 0, this.maxY = 255;
		this.minPb = this.minPr = 0;
		this.maxPb = this.maxPr = 255;
	}
	/**
	 * @param { number } [r = 0]
	 * @param { number } [g = 0]
	 * @param { number } [b = 0]
	 * @returns { number } - Between (min, max) possibles of (r, g, b)
	 * @memberof YCbCr
	 */
	Y(r = 0, g = 0, b = 0){
		return this.Kr * r + this.Kg * g + this.Kb * b;
	}
	/**
	 * @param { number } [r = 0]
	 * @param { number } [g = 0]
	 * @param { number } [b = 0]
	 * @returns { number }
	 * @memberof YCbCr
	 */
	Pb(r = 0, g = 0, b = 0){
		return 127.5 + (b - this.Y(r, g, b)) * this.over_Kb;
	}
	/**
	 * @param { number } [r = 0]
	 * @param { number } [g = 0]
	 * @param { number } [b = 0]
	 * @returns { number }
	 * @memberof YCbCr
	 */
	Pr(r = 0, g = 0, b = 0){
		return 127.5 + (r - this.Y(r, g, b)) * this.over_Kr;
	}
	/**
	 * @param { number } [r = 0]
	 * @param { number } [g = 0]
	 * @param { number } [b = 0]
	 * @returns { [ Y: number, Pb: number, Pr: number ] }
	 * @memberof YCbCr
	 */
	YPbPr(r = 0, g = 0, b = 0){
		const	{ Kr, Kg, Kb } = this,
			Y = Kr * r + Kg * g + Kb * b;
		return [
			Y,
			127.5 + (b - Y) * this.over_Kb,
			127.5 + (r - Y) * this.over_Kr
		];
	}
	/**
	 * @param { number } [y = 0]
	 * @param { number } [pb = 0]
	 * @param { number } [pr = 0]
	 * @returns { [ R: number, G: number, B: number ] }
	 * @memberof YCbCr
	 */
	RGB(y = 0, pb = 0, pr = 0){
		const	{ Kr, Kg, Kb } = this;
		pb -= 127.5, pr -= 127.5;
		return [
			y + pr * this._Kr,
			y - (pb * this.Kb_Kb + pr * this.Kr_Kr) / Kg,
			y + pb * this._Kb
		];
	}
}
module.exports = _YCbCr;

/**
 * @param { number } [K_R]
 * @param { number } [K_G]
 * @param { number } [K_B]
 * @returns { YCbCr }
 */
function _YCbCr(K_R, K_G, K_B){
	return new YCbCr(K_R, K_G, K_B);
}