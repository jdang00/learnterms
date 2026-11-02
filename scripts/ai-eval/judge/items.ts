// Loaders that turn eval runs and candidate markdown into JudgeItems. Pure except for file reads.
import type { JudgeItem, QuestionType } from './criteria';

export type SourcedItem = JudgeItem & { config: string; source: string };

type Evidence = { citationId?: string; pageNumber?: number; text: string };
type EvalRun = {
	doc: string;
	config: string;
	slots: Array<{ slotId: string; questionType: QuestionType }>;
	accepted: Array<{
		slot: { slotId: string; questionType: QuestionType; evidence?: Evidence[] };
		draft: { stem: string; options: string[]; answerIndex: number; rationale: string };
	}>;
	calls?: Array<{ costUsd?: number }>;
};

export function formatEvidence(evidence: Evidence[] = []) {
	return evidence
		.map((e) => `[${e.citationId ?? `p${e.pageNumber ?? '?'}`}] ${e.text.trim()}`)
		.join('\n\n');
}

/** `<hash>.<config>-rN.question-types-vNN.json` → config `<config>@vNN` (repeats grouped). */
export function configFromEvalFile(path: string, run: Pick<EvalRun, 'config'>) {
	const version = path.match(/\.question-types-(v\d+)\.json$/)?.[1] ?? 'v?';
	return `${run.config.replace(/-r\d+$/, '')}@${version}`;
}

export function itemsFromEvalRun(path: string, run: EvalRun): SourcedItem[] {
	const config = configFromEvalFile(path, run);
	const name = path.split('/').pop() ?? path;
	return run.accepted.map((a) => ({
		id: `${name.slice(0, 8)}:${run.config}:${config.split('@')[1]}:${a.slot.slotId}`,
		config,
		source: path,
		questionType: a.slot.questionType,
		stem: a.draft.stem,
		options: a.draft.options,
		answerIndex: a.draft.answerIndex,
		rationale: a.draft.rationale,
		evidence: formatEvidence(a.slot.evidence)
	}));
}

/** Slots requested and generation spend recorded in the run's own calls (a lower bound: failed
 * calls are missing; pass --spend for ledger totals). */
export function runStats(run: EvalRun) {
	return {
		slots: run.slots.length,
		callSpendUsd: (run.calls ?? []).reduce((s, c) => s + (c.costUsd ?? 0), 0)
	};
}

export type MarkdownQuestion = {
	index: number;
	pages: number[];
	stem: string;
	options: string[];
	answerIndex: number;
	rationale: string;
};

/** Parses the live-run candidate format: `## N (p.4,3)`, stem lines, `*`/`-` options, `Rationale (Nw): …`. */
export function parseCandidatesMarkdown(text: string): MarkdownQuestion[] {
	const sections = text.split(/^## /m).slice(1);
	return sections.flatMap((section) => {
		const lines = section.split('\n');
		const header = lines[0].match(/^(\d+)\s*(?:\(p\.([\d,\s]+)\))?/);
		if (!header) return [];
		const stem: string[] = [];
		const options: string[] = [];
		let answerIndex = -1;
		let rationale = '';
		for (const line of lines.slice(1)) {
			const option = line.match(/^([*-])\s+(.*)$/);
			const why = line.match(/^Rationale(?:\s*\([^)]*\))?:\s*(.*)$/);
			if (why) rationale = why[1].trim();
			else if (option) {
				if (option[1] === '*') answerIndex = options.length;
				options.push(option[2].trim());
			} else if (rationale && line.trim()) rationale += ` ${line.trim()}`;
			else if (!options.length && line.trim()) stem.push(line.trim());
		}
		if (answerIndex < 0 || options.length < 2 || !stem.length) return [];
		return [
			{
				index: Number(header[1]),
				pages: (header[2] ?? '')
					.split(',')
					.map((p) => Number(p.trim()))
					.filter(Boolean),
				stem: stem.join(' '),
				options,
				answerIndex,
				rationale
			}
		];
	});
}

type Page = { pageNumber: number; text: string };

export function evidenceFromPages(pages: Page[], numbers: number[]) {
	return numbers
		.flatMap((n) => pages.filter((p) => p.pageNumber === n))
		.map((p) => `[p${p.pageNumber}] ${p.text.trim()}`)
		.join('\n\n');
}

export function itemsFromMarkdown(
	path: string,
	text: string,
	opts: { config: string; questionType?: QuestionType; pages?: Page[] }
): SourcedItem[] {
	return parseCandidatesMarkdown(text).map((q) => ({
		id: `${opts.config}:${q.index}`,
		config: opts.config,
		source: path,
		questionType: opts.questionType ?? 'learn',
		stem: q.stem,
		options: q.options,
		answerIndex: q.answerIndex,
		rationale: q.rationale,
		evidence: opts.pages ? evidenceFromPages(opts.pages, q.pages) : undefined
	}));
}

export async function loadEvalRun(path: string) {
	return (await Bun.file(path).json()) as EvalRun;
}
