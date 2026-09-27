// Worth 4 Dot: red dot at 12 o'clock, green at 3 and 9, white at 6, viewed through red/green goggles.
// The red-lens eye sees the red image (red + white-as-red), the green-lens eye the green image
// (both greens + white-as-green). Offsets move the red image relative to the green one, in the
// patient's view: +x is the patient's right, +y is down, one unit is the flashlight's dot spacing.

export const W4D_RESPONSES = [
	'Fusion',
	'Suppression OD',
	'Suppression OS',
	'Alternating suppression',
	'Diplopia'
] as const;
export type W4dResponse = (typeof W4D_RESPONSES)[number];

export const W4D_WHITE = ['Mixed', 'Red', 'Green', 'Alternates'] as const;
export const W4D_LENSES = ['Red OD / green OS', 'Red OS / green OD'] as const;

export type Eye = 'OD' | 'OS';
export type Offset = { x: number; y: number };
export type Worth4DotState = { response: W4dResponse; white?: string; offset: Offset | null };
export type DiplopiaPreset = 'uncrossed' | 'crossed' | 'rHyper' | 'lHyper';

export const W4D_LIMIT = { x: 2.4, y: 1.2 };
// Closer than this, the images fuse again.
export const W4D_SNAP = 0.3;
// Smaller shifts along one axis don't count as displacement on that axis.
const AXIS_THRESHOLD = 0.25;

const otherEye = (eye: Eye): Eye => (eye === 'OD' ? 'OS' : 'OD');
const round = (value: number) => Math.round(value * 20) / 20;
const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

export function redEyeFor(lenses?: string): Eye {
	return /^\s*red\s+os/i.test(lenses ?? '') ? 'OS' : 'OD';
}

export function parseResponse(value?: string): W4dResponse | undefined {
	const text = value?.trim().toLowerCase();
	return W4D_RESPONSES.find((response) => response.toLowerCase() === text);
}

export function clampOffset(offset: Offset): Offset {
	return { x: round(clamp(offset.x, W4D_LIMIT.x)), y: round(clamp(offset.y, W4D_LIMIT.y)) };
}

export function parseOffset(value?: string): Offset | null {
	const match = value?.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
	return match ? clampOffset({ x: Number(match[1]), y: Number(match[2]) }) : null;
}

export function formatOffset(offset: Offset) {
	const { x, y } = clampOffset(offset);
	return `${x + 0},${y + 0}`;
}

export function isFusedOffset(offset: Offset) {
	return Math.hypot(offset.x, offset.y) < W4D_SNAP;
}

// Uncrossed diplopia puts the red image on the red-lens eye's side; the lower image is the hyper eye's.
export function presetOffset(preset: DiplopiaPreset, redEye: Eye): Offset {
	const side = redEye === 'OD' ? 1 : -1;
	if (preset === 'uncrossed') return { x: 1.6 * side, y: 0 };
	if (preset === 'crossed') return { x: -1.6 * side, y: 0 };
	const redIsHyper = (preset === 'rHyper') === (redEye === 'OD');
	return { x: 0, y: redIsHyper ? 1.1 : -1.1 };
}

export function diplopiaPattern(offset: Offset, redEye: Eye) {
	const side = redEye === 'OD' ? 1 : -1;
	const horizontal =
		Math.abs(offset.x) < AXIS_THRESHOLD
			? undefined
			: offset.x * side > 0
				? ('uncrossed' as const)
				: ('crossed' as const);
	const hyperEye =
		Math.abs(offset.y) < AXIS_THRESHOLD ? undefined : offset.y > 0 ? redEye : otherEye(redEye);
	return { horizontal, hyperEye };
}

export function worth4DotSummary(state: Worth4DotState, redEye: Eye) {
	const greenEye = otherEye(redEye);
	if (state.response === 'Fusion') {
		const white = state.white?.trim().toLowerCase();
		const detail =
			white === 'red'
				? `White dot red · ${redEye} dominant`
				: white === 'green'
					? `White dot green · ${greenEye} dominant`
					: white === 'alternates'
						? 'White dot alternates red/green'
						: white === 'mixed'
							? 'White dot mixed'
							: undefined;
		return { title: 'Fusion', dots: '4 dots', detail };
	}
	if (state.response === 'Alternating suppression')
		return { title: 'Alternating suppression', dots: '2 red ↔ 3 green', detail: undefined };
	if (state.response === 'Diplopia') {
		const { horizontal, hyperEye } = diplopiaPattern(
			state.offset ?? presetOffset('uncrossed', redEye),
			redEye
		);
		const title = horizontal
			? `${horizontal === 'uncrossed' ? 'Uncrossed' : 'Crossed'} diplopia`
			: hyperEye
				? 'Vertical diplopia'
				: 'Diplopia';
		const detail = [
			horizontal && (horizontal === 'uncrossed' ? 'Eso pattern' : 'Exo pattern'),
			hyperEye && `${hyperEye === 'OD' ? 'R' : 'L'} hyper`
		]
			.filter(Boolean)
			.join(' · ');
		return { title, dots: '5 dots', detail: detail || undefined };
	}
	const suppressed = state.response === 'Suppression OD' ? 'OD' : 'OS';
	return {
		title: `Suppression ${suppressed}`,
		dots: suppressed === redEye ? '3 green dots' : '2 red dots',
		detail: undefined
	};
}

// What the patient reports, without the diagnosis, for quiz questions and screen readers.
export function worth4DotPercept(state: Worth4DotState, redEye: Eye) {
	if (state.response === 'Fusion') {
		const white = state.white?.trim().toLowerCase();
		const bottom =
			white === 'red' || white === 'green'
				? white
				: white === 'alternates'
					? 'alternating red and green'
					: 'mixed';
		return `4 dots: red above, green left and right, ${bottom} below`;
	}
	if (state.response === 'Alternating suppression')
		return 'Alternates between 2 red dots and 3 green dots';
	if (state.response === 'Diplopia') {
		const offset = state.offset ?? presetOffset('uncrossed', redEye);
		const shifts = [
			Math.abs(offset.x) < AXIS_THRESHOLD ? '' : offset.x > 0 ? 'right' : 'left',
			Math.abs(offset.y) < AXIS_THRESHOLD ? '' : offset.y > 0 ? 'down' : 'up'
		].filter(Boolean);
		return shifts.length ? `5 dots: 2 red shifted ${shifts.join(' and ')} from 3 green` : '5 dots';
	}
	const suppressed = state.response === 'Suppression OD' ? 'OD' : 'OS';
	return suppressed === redEye ? '3 green dots' : '2 red dots';
}
