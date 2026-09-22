import { ComputeEngine } from '@cortex-js/compute-engine';

export type AngleMode = 'deg' | 'rad';
export type CalculationRequest = {
	latex: string;
	angle: AngleMode;
	variables?: Record<string, number>;
};
export type CalculationResult = { value: number; variables: string[] };

// A numeric calculator, with a deliberately small language. No assignments, loops, or scripts.
const OPERATORS = new Set([
	'Add',
	'Subtract',
	'Multiply',
	'Divide',
	'Negate',
	'Power',
	'Root',
	'Sqrt',
	'Sin',
	'Cos',
	'Tan',
	'Arcsin',
	'Arccos',
	'Arctan',
	'Ln',
	'Log',
	'Log10',
	'InvisibleOperator',
	'Exp',
	'Abs',
	'Factorial',
	'Rational',
	'Delimiter',
	'Degrees',
	'Percent'
]);

export function calculate({ latex, angle, variables = {} }: CalculationRequest): CalculationResult {
	if (!latex.trim()) throw new Error('Enter an expression first.');
	if (latex.length > 1000) throw new Error('Keep expressions under 1,000 characters.');
	const engine = new ComputeEngine();
	engine.angularUnit = angle;
	const expression = engine.parse(latex, { form: 'raw' });
	if (!expression.isValid) throw new Error('Check the expression for missing values or brackets.');
	let count = 0;
	function validate(node: unknown, depth = 0) {
		if (++count > 250 || depth > 30) throw new Error('This expression is too complex.');
		if (Array.isArray(node)) {
			if (!OPERATORS.has(String(node[0])))
				throw new Error('Use numeric arithmetic and scientific functions.');
			for (const child of node.slice(1)) validate(child, depth + 1);
		}
	}
	validate(expression.json);
	const unknowns = [...expression.unknowns];
	if (unknowns.some((name) => !/^[a-zA-Z]$/.test(name)))
		throw new Error('Use single-letter variables, such as x, F, or d.');
	const missing = unknowns.filter((name) => !Number.isFinite(variables[name]));
	if (missing.length) return { value: NaN, variables: unknowns };
	const evaluated = expression.subs(variables).N();
	const value = evaluated.re;
	const imaginary = evaluated.im;
	if (imaginary || value === undefined || !Number.isFinite(value))
		throw new Error(
			'No finite real result. Check for division by zero or values outside the function’s domain.'
		);
	return { value, variables: unknowns };
}
