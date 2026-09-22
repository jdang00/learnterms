import { expect, test } from 'bun:test';
import { convertAsciiMathToLatex } from 'mathlive/ssr';
import { calculate } from '../src/lib/calculator/engine';
import { fillFormula } from '../src/lib/calculator/format';
import { FORMULAS, readCustomFormulas } from '../src/lib/calculator/formulas';
const evaluate = (latex: string, angle: 'deg' | 'rad' = 'deg', variables = {}) =>
	calculate({ latex, angle, variables }).value;

test('typed arithmetic respects precedence, fractions, roots, percentages, and signs', () => {
	for (const [input, expected] of [
		['2+3*4', 14],
		['(2+3)*4', 20],
		['sqrt(25)+3^2', 14],
		['1/4', 0.25],
		['-2^2', -4]
	] as const)
		expect(evaluate(convertAsciiMathToLatex(input))).toBeCloseTo(expected, 10);
	expect(evaluate('200\\times10\\%')).toBeCloseTo(20, 10);
	expect(evaluate('\\log_{10}(1000)')).toBeCloseTo(3, 10);
	expect(evaluate('e^{2}')).toBeCloseTo(Math.exp(2), 10);
});
test('degree and radian modes affect forward and inverse trig', () => {
	expect(evaluate('\\sin(30)')).toBeCloseTo(0.5, 10);
	expect(evaluate('\\sin(\\pi/2)', 'rad')).toBeCloseTo(1, 10);
	expect(evaluate('\\arcsin(0.5)')).toBeCloseTo(30, 10);
	expect(evaluate('\\arcsin(0.5)', 'rad')).toBeCloseTo(Math.PI / 6, 10);
});
test('invalid and nonreal calculations never report a numeric answer', () => {
	for (const expression of [
		'',
		'1/0',
		'\\sqrt{-1}',
		'\\ln(-1)',
		'\\frac{1}{}',
		'x=2',
		'\\sum_{n=1}^{100}n'
	])
		expect(() => evaluate(expression)).toThrow();
});
test('formula variables are requested before evaluating and do not leak between calculations', () => {
	const result = calculate({ latex: 'x+2', angle: 'deg' });
	expect(result.variables).toEqual(['x']);
	expect(Number.isNaN(result.value)).toBe(true);
	expect(evaluate('x+2', 'deg', { x: 3 })).toBe(5);
	expect(Number.isNaN(evaluate('x+2'))).toBe(true);
});
test('optics formulas convert input units and preserve power signs', () => {
	const formula = (id: string) => FORMULAS.find((f) => f.id === id)!.latex;
	expect(evaluate(formula('spherical-equivalent'), 'deg', { S: -2, C: -1 })).toBe(-2.5);
	expect(evaluate(formula('prentice'), 'deg', { c: 5, F: -4 })).toBe(2);
	expect(evaluate(formula('vertex'), 'deg', { F: -10, d: 12 })).toBeCloseTo(-8.92857142857, 9);
	expect(evaluate(formula('vertex'), 'deg', { F: 10, d: 12 })).toBeCloseTo(11.3636363636, 9);
	expect(evaluate(formula('focal-power'), 'deg', { f: -25 })).toBe(-4);
	expect(evaluate(formula('percentage'), 'deg', { a: 3, b: 4 })).toBe(75);
});
test('malformed saved formulas cannot break the library', () => {
	expect(readCustomFormulas('not json')).toEqual([]);
	expect(readCustomFormulas('[null, {}, {"id":"custom-1"}]')).toEqual([]);
});

test('previous answers in scientific notation are reinserted as numbers', async () => {
	const { numberToLatex } = await import('../src/lib/calculator/format');
	for (const value of [1e-10, -2.5e-12, 3e22])
		expect(evaluate(numberToLatex(value)) / value).toBeCloseTo(1, 12);
});

test('formulas display entered values without touching LaTeX commands', () => {
	const vertex = FORMULAS.find((f) => f.id === 'vertex')!;
	expect(fillFormula(vertex.latex, { F: '-8', d: '12' })).toBe(
		'\\frac{-8}{1-\\frac{12}{1000}\\cdot \\left(-8\\right)}'
	);
	expect(fillFormula(vertex.latex, { F: '', d: '12' })).toBe('\\frac{F}{1-\\frac{12}{1000}F}');
	expect(fillFormula('\\left|\\frac{cF}{10}\\right|', { c: '3', F: '2' })).toBe(
		'\\left|\\frac{3\\cdot 2}{10}\\right|'
	);
	expect(evaluate(fillFormula(vertex.latex, { F: '-8', d: '12' }))).toBeCloseTo(-7.29927, 5);
});
