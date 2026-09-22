export function formatDuration(totalSeconds: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds));
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const TEXT_SCALES = [1, 1.15, 1.3, 0.9] as const;

export function nextTextScale(current: number): number {
	const index = TEXT_SCALES.findIndex((scale) => Math.abs(scale - current) < 0.001);
	return TEXT_SCALES[(index + 1) % TEXT_SCALES.length];
}

export function clampTextScale(value: unknown): number {
	const n = Number(value);
	return TEXT_SCALES.some((scale) => Math.abs(scale - n) < 0.001) ? n : 1;
}
