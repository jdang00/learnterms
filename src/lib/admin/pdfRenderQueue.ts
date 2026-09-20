// A long deck can expose many thumbnail canvases at once. Bound rendering work.
let active = 0;
const waiting: Array<() => void> = [];
export async function withPdfRenderSlot(work: () => Promise<void>) {
	if (active >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
	else active++;
	try {
		await work();
	} finally {
		const next = waiting.shift();
		if (next) next();
		else active--;
	}
}
