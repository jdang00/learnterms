// A long deck can expose many thumbnail canvases at once. Bound rendering work.
let active = 0;
const waiting: Array<() => void> = [];
const priorityWaiting: Array<() => void> = [];
export async function withPdfRenderSlot(work: () => Promise<void>, priority = false) {
	if (active >= 3)
		await new Promise<void>((resolve) => (priority ? priorityWaiting : waiting).push(resolve));
	else active++;
	try {
		await work();
	} finally {
		const next = priorityWaiting.shift() ?? waiting.shift();
		if (next) next();
		else active--;
	}
}
