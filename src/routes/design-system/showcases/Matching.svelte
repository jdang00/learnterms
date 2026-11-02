<script lang="ts" module>
	import type { ShowcaseMeta } from '../showcases';

	export const meta: ShowcaseMeta = {
		title: 'Matching',
		summary:
			'Prompt chips and answer pills for matching questions: quiz, practice test, revealed answers, admin preview and the editor.',
		updated: '2026-10-20',
		sources: [
			'src/lib/utils/matching.ts',
			'src/lib/components/matching/Matching.svelte',
			'src/lib/components/matching/MatchingBoard.svelte',
			'src/lib/components/matching/MatchPicker.svelte',
			'src/lib/components/matching/MatchResultCell.svelte',
			'src/lib/admin/questions/editor/MatchingOptions.svelte'
		]
	};
</script>

<script lang="ts">
	import Matching from '#lib/components/matching/Matching.svelte';
	import MatchingBoard from '#lib/components/matching/MatchingBoard.svelte';
	import MatchResultCell from '#lib/components/matching/MatchResultCell.svelte';
	import MatchingOptions from '#lib/admin/questions/editor/MatchingOptions.svelte';
	import { QuestionEditorState } from '#lib/admin/questions/editor/questionEditor.svelte.js';
	import { QUESTION_TYPES } from '#lib/types.js';
	import { correctPairs, matchResults, type MatchingQuestion } from '#lib/utils/matching.js';
	import ShowcaseSection from '../ShowcaseSection.svelte';
	import { cranialNerves, lowVision } from './matchingFixtures';

	// A stand-in for quiz state: just the fields the matching component reads and writes.
	class DemoState {
		selectedAnswers = $state<string[]>([]);
		showSolution = $state(false);
		constructor(initial: string[] = [], solved = false) {
			this.selectedAnswers = initial;
			this.showSolution = solved;
		}
		handleSolution() {
			this.showSolution = !this.showSolution;
		}
	}

	// Disability has no answer, so its definition becomes a distractor.
	const noMatch = {
		...lowVision,
		_id: 'demo-no-match',
		correctAnswers: lowVision.correctAnswers.slice(0, 3)
	};

	const partial = correctPairs(cranialNerves)
		.slice(0, 9)
		.map((pair, i) => (i === 3 ? 'p3::a5' : i === 5 ? 'p5::a3' : pair));

	const demos: Array<{
		title: string;
		note: string;
		qs: DemoState;
		question: MatchingQuestion;
		allowSolution?: boolean;
	}> = [
		{
			title: 'Quiz: short set, long definitions',
			note: 'The question from the original bug report. Chips share one column width.',
			qs: new DemoState(),
			question: lowVision
		},
		{
			title: 'Quiz: twelve pairs, four distractors',
			note: 'Search appears in the picker; answers used by another prompt are dimmed and move when picked.',
			qs: new DemoState(),
			question: cranialNerves
		},
		{
			title: 'Practice test',
			note: 'Same component with allowSolution off, as the test runner renders it.',
			qs: new DemoState(),
			question: lowVision,
			allowSolution: false
		},
		{
			title: 'Prompt without an answer',
			note: 'Disability has no match, so it is correct only when left blank. Shown revealed after a correct attempt.',
			qs: new DemoState(noMatch.correctAnswers, true),
			question: noMatch
		},
		{
			title: 'Revealed, with misses and blanks',
			note: 'After Check or the eye button. Rows 4 and 6 are swapped; 10 to 12 are blank.',
			qs: new DemoState(partial, true),
			question: cranialNerves
		}
	];

	const adminRows = matchResults(lowVision, []).map(({ id, prompt, correct }) => ({
		id,
		prompt,
		correct
	}));

	const editor = new QuestionEditorState(() => {});
	editor.reset(
		{ ...noMatch, type: QUESTION_TYPES.MATCHING, metadata: {} } as never,
		'edit',
		'draft'
	);
</script>

{#each demos as demo (demo.title)}
	<ShowcaseSection title={demo.title} note={demo.note}>
		<Matching qs={demo.qs} currentlySelected={demo.question} allowSolution={demo.allowSolution} />
	</ShowcaseSection>
{/each}

<ShowcaseSection title="Admin preview" note="The key only, as QuestionDetailView shows it.">
	<MatchingBoard rows={adminRows}>
		{#snippet answer(row)}
			<MatchResultCell correct={row.correct} />
		{/snippet}
	</MatchingBoard>
</ShowcaseSection>

<ShowcaseSection
	title="Editor"
	note="Add prompt and Add answer fill each column on its own: a prompt alone has no answer, an answer alone is a distractor. Enter walks prompt → answer → next row; paste two spreadsheet columns into a prompt to add many pairs."
>
	<MatchingOptions form={editor} />
</ShowcaseSection>
