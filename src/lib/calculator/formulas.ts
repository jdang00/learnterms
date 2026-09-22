export type Formula = {
	id: string;
	name: string;
	latex: string;
	description: string;
	unit?: string;
	variables: { symbol: string; label: string; unit?: string; min?: number }[];
	source?: string;
};

// Expressions and input metadata are kept together so new formulas need no UI changes.
export const FORMULAS: Formula[] = [
	{
		id: 'spherical-equivalent',
		name: 'Spherical equivalent',
		latex: 'S+\\frac{C}{2}',
		description: 'Sphere plus half the cylinder. Keep the prescription’s cylinder sign.',
		unit: 'D',
		variables: [
			{ symbol: 'S', label: 'Sphere', unit: 'D' },
			{ symbol: 'C', label: 'Cylinder', unit: 'D' }
		]
	},
	{
		id: 'prentice',
		name: 'Prentice’s rule',
		latex: '\\left|\\frac{cF}{10}\\right|',
		description:
			'Induced prism magnitude. Enter decentration in millimeters and power in the relevant meridian. Base direction is determined separately.',
		unit: 'Δ',
		variables: [
			{ symbol: 'c', label: 'Decentration', unit: 'mm', min: 0 },
			{ symbol: 'F', label: 'Lens power', unit: 'D' }
		],
		source: 'https://eyewiki.org/Lensometry'
	},
	{
		id: 'vertex',
		name: 'Vertex conversion',
		latex: '\\frac{F}{1-\\frac{d}{1000}F}',
		description:
			'Spectacle power converted to the corneal plane. Enter positive spectacle vertex distance in millimeters. Calculate each principal meridian separately.',
		unit: 'D',
		variables: [
			{ symbol: 'F', label: 'Spectacle power', unit: 'D' },
			{ symbol: 'd', label: 'Vertex distance', unit: 'mm', min: 0 }
		],
		source: 'https://courseware.cutm.ac.in/wp-content/uploads/2020/06/IACLE-2-INTRO.-TO-CLS.pdf'
	},
	{
		id: 'focal-power',
		name: 'Focal length to power',
		latex: '\\frac{100}{f}',
		description: 'Reciprocal focal length in air. Use signed focal length in centimeters.',
		unit: 'D',
		variables: [{ symbol: 'f', label: 'Focal length', unit: 'cm' }]
	},
	{
		id: 'percentage',
		name: 'Percentage',
		latex: '\\frac{a}{b}\\times100',
		description: 'Express a part as a percentage of the whole.',
		unit: '%',
		variables: [
			{ symbol: 'a', label: 'Part' },
			{ symbol: 'b', label: 'Whole' }
		]
	}
];

export function readCustomFormulas(raw: string | null): Formula[] {
	try {
		const values: unknown = JSON.parse(raw ?? '[]');
		if (!Array.isArray(values)) return [];
		return values
			.filter(
				(f): f is Formula =>
					!!f &&
					typeof f === 'object' &&
					typeof f.id === 'string' &&
					f.id.startsWith('custom-') &&
					typeof f.name === 'string' &&
					f.name.length <= 60 &&
					typeof f.latex === 'string' &&
					f.latex.length <= 1000 &&
					typeof f.description === 'string' &&
					Array.isArray(f.variables) &&
					f.variables.length <= 26 &&
					f.variables.every(
						(v: Formula['variables'][number]) =>
							v && /^[a-zA-Z]$/.test(v.symbol) && typeof v.label === 'string'
					)
			)
			.slice(0, 40);
	} catch {
		return [];
	}
}
