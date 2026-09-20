import { closeSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';

/** One writer across OCR and model ledgers; a crash leaves a fail-closed lock. */
export function lockEvaluationBudget(root: string) {
	mkdirSync(root, { recursive: true });
	const path = `${root}/budget.lock`;
	let fd: number;
	try {
		fd = openSync(path, 'wx');
	} catch {
		throw new Error(
			`Evaluation already running, or a stale lock exists: ${path}. Check its PID before removing it.`
		);
	}
	writeFileSync(fd, String(process.pid));
	process.once('exit', () => {
		closeSync(fd);
		unlinkSync(path);
	});
}
