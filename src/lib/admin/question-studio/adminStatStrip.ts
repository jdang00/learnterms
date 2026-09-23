/** One reading in an admin instrument strip. */
export type StatItem = {
	label: string;
	value: string;
	note?: string;
	tone?: 'warning' | 'error' | 'success';
	/** 0–1, drawn as a hairline fill under the value. */
	fill?: number;
};
