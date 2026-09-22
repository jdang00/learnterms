// JavaScript's 1e-10 notation is not a LaTeX number: e would become Euler's constant.
export function numberToLatex(value: number): string {
	return String(value).replace(/e([+-]?\d+)$/, (_, exponent) => `\\times10^{${Number(exponent)}}`);
}

// Shows a formula with the entered values in place of its single-letter variables.
export function fillFormula(latex: string, values: Record<string, string>): string {
	let output = '';
	for (let i = 0; i < latex.length; i++) {
		const char = latex[i];
		if (char === '\\') {
			const command = /^\\([a-zA-Z]+|.)/.exec(latex.slice(i))?.[0] ?? char;
			output += command;
			i += command.length - 1;
			continue;
		}
		const raw = values[char]?.trim();
		const value = raw ? Number(raw) : NaN;
		if (!/[a-zA-Z]/.test(char) || !Number.isFinite(value)) {
			output += char;
			continue;
		}
		const number = numberToLatex(value);
		const operand = value < 0 && !/(^|[{(])$/.test(output) ? `\\left(${number}\\right)` : number;
		output += /[\w})]$/.test(output) ? `\\cdot ${operand}` : operand;
	}
	return output;
}
