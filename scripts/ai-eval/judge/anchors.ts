// Free: builds tmp/ai-eval-judge/anchors.json and anchors-for-review.md from labels.json and the
// source files it points at. Usage: bun scripts/ai-eval/judge/anchors.ts
import {
	CRITERIA,
	appliesTo,
	type Criteria,
	type CriterionKey,
	type JudgeItem,
	type Overall,
	type QuestionType
} from './criteria';
import { JUDGE_ROOT } from './claude';
import { evidenceFromPages, formatEvidence, parseCandidatesMarkdown } from './items';

export type AnchorLabel = {
	id: string;
	src: { human?: string; md?: string; index?: number; run?: string; slot?: string };
	overall: Overall;
	uncertain?: boolean;
	fail?: CriterionKey[];
	pass?: CriterionKey[];
	na?: CriterionKey[];
	reasons: string[];
	questionType?: QuestionType;
};

export type Anchor = JudgeItem & {
	origin: 'human' | 'generated';
	source: string;
	label: { criteria: Criteria; overall: Overall; uncertain: boolean; reasons: string[] };
};

/** Expands a compact label: applicable criteria default to pass, numbersUnits defaults to na. */
export function expandLabel(label: AnchorLabel, type: QuestionType): Criteria {
	return Object.fromEntries(
		CRITERIA.map((key) => {
			if (!appliesTo(key, type)) return [key, 'na'];
			if (label.fail?.includes(key)) return [key, 'fail'];
			if (label.pass?.includes(key)) return [key, 'pass'];
			if (label.na?.includes(key)) return [key, 'na'];
			return [key, key === 'numbersUnits' ? 'na' : 'pass'];
		})
	) as Criteria;
}

type Human = {
	id: string;
	questionType: QuestionType;
	stem: string;
	options: string[];
	correctAnswers: string[];
	rationale: string;
};

export async function loadAnchors(path = `${JUDGE_ROOT}/anchors.json`): Promise<Anchor[]> {
	return Bun.file(path).json();
}

async function build() {
	const spec: { sources: { human: string; pages: string }; labels: AnchorLabel[] } = await Bun.file(
		`${JUDGE_ROOT}/labels.json`
	).json();
	const humans: Human[] = await Bun.file(spec.sources.human).json();
	const pages = await Bun.file(spec.sources.pages).json();
	const markdown = new Map<string, ReturnType<typeof parseCandidatesMarkdown>>();
	const anchors: Anchor[] = [];
	for (const label of spec.labels) {
		let item: Omit<Anchor, 'label' | 'origin' | 'source' | 'id'>;
		let source: string;
		if (label.src.human) {
			const h = humans.find((x) => x.id === label.src.human);
			if (!h) throw new Error(`Missing exemplar ${label.src.human}`);
			const answerIndex = h.options.findIndex((o) => h.correctAnswers.includes(o));
			item = { ...h, answerIndex };
			source = `prod:${h.id}`;
		} else if (label.src.md) {
			if (!markdown.has(label.src.md))
				markdown.set(label.src.md, parseCandidatesMarkdown(await Bun.file(label.src.md).text()));
			const q = markdown.get(label.src.md)!.find((x) => x.index === label.src.index);
			if (!q) throw new Error(`Missing ${label.src.md} #${label.src.index}`);
			item = {
				questionType: label.questionType ?? 'learn',
				stem: q.stem,
				options: q.options,
				answerIndex: q.answerIndex,
				rationale: q.rationale,
				evidence: evidenceFromPages(pages, q.pages)
			};
			source = `${label.src.md}#${q.index}`;
		} else {
			const run = await Bun.file(label.src.run!).json();
			const a = run.accepted.find(
				(x: { slot: { slotId: string } }) => x.slot.slotId === label.src.slot
			);
			if (!a) throw new Error(`Missing ${label.src.run} ${label.src.slot}`);
			item = {
				questionType: a.slot.questionType,
				stem: a.draft.stem,
				options: a.draft.options,
				answerIndex: a.draft.answerIndex,
				rationale: a.draft.rationale,
				evidence: formatEvidence(a.slot.evidence)
			};
			source = `${label.src.run}#${label.src.slot}`;
		}
		anchors.push({
			id: label.id,
			origin: label.src.human ? 'human' : 'generated',
			source,
			questionType: item.questionType,
			stem: item.stem,
			options: item.options,
			answerIndex: item.answerIndex,
			rationale: item.rationale,
			...(item.evidence ? { evidence: item.evidence } : {}),
			label: {
				criteria: expandLabel(label, item.questionType),
				overall: label.overall,
				uncertain: label.uncertain ?? false,
				reasons: label.reasons
			}
		});
	}
	await Bun.write(`${JUDGE_ROOT}/anchors.json`, JSON.stringify(anchors, null, 2));
	await Bun.write(`${JUDGE_ROOT}/anchors-for-review.md`, reviewMarkdown(anchors));
	const count = (o: Overall) => anchors.filter((a) => a.label.overall === o).length;
	console.log(
		`${anchors.length} anchors (${anchors.filter((a) => a.origin === 'human').length} human): ${count('good')} good, ${count('acceptable')} acceptable, ${count('poor')} poor`
	);
}

export function reviewMarkdown(anchors: Anchor[]) {
	const out = [
		'# Anchor labels for review',
		'',
		'Correct a label by editing `tmp/ai-eval-judge/labels.json` (`overall`, `fail`, `pass`, `na`, `uncertain`), then run `bun scripts/ai-eval/judge/anchors.ts`. Applicable criteria default to pass; `numbersUnits` defaults to na. `?` marks labels I am unsure of.',
		'',
		`Criteria: ${CRITERIA.join(', ')}.`,
		''
	];
	for (const a of anchors) {
		const fails = CRITERIA.filter((k) => a.label.criteria[k] === 'fail');
		out.push(
			`## ${a.id} · ${a.questionType} · **${a.label.overall}**${a.label.uncertain ? ' ?' : ''}`,
			'',
			`Source: \`${a.source}\``,
			'',
			a.stem,
			'',
			...a.options.map((o, i) => `${i === a.answerIndex ? '- **✓**' : '-'} ${o}`),
			'',
			`Rationale: ${a.rationale}`,
			'',
			`Fails: ${fails.length ? fails.join(', ') : 'none'}`,
			...a.label.reasons.map((r) => `- ${r}`),
			''
		);
	}
	return out.join('\n');
}

if (import.meta.main) await build();
