import { describe, expect, test } from 'bun:test';
import {
	createCalculationTracker,
	createStudyToolCapture,
	createToolVisibilityTracker,
	studyToolProperties,
	type StudyToolContext,
	type ToolCapture
} from '../src/lib/analytics/studyToolEvents';

const context: StudyToolContext = {
	surface: 'module_quiz',
	pathname: '/classes/c/modules/m',
	classId: 'c',
	moduleId: 'm',
	questionId: 'q1',
	questionType: 'Multiple Choice'
};
function recorder() {
	const events: Parameters<ToolCapture>[] = [];
	const capture: ToolCapture = (...args) => {
		events.push(args);
	};
	return { events, capture };
}

describe('study tool telemetry', () => {
	test('allowlists metadata and excludes content, errors, and URL query strings', () => {
		const properties = studyToolProperties(
			'notes',
			{
				...context,
				pathname: '/classes/c/modules/m?secret=private#note',
				...{ text: 'private note', email: 'private@example.com' }
			},
			{
				action: 'created',
				outcome: 'success',
				character_count: 24,
				...{
					content: 'private note',
					quote: 'selected text',
					latex: 'sensitive expression',
					value: 123,
					error: 'private failure'
				}
			}
		);
		expect(properties).toEqual({
			...context,
			pathname: '/classes/c/modules/m',
			telemetry_version: 1,
			tool: 'notes',
			action: 'created',
			outcome: 'success',
			character_count: 24
		});
	});
	test('standalone calculations carry no stale question or attempt identifiers', () => {
		expect(
			studyToolProperties(
				'calculator',
				{ surface: 'standalone_calculator' },
				{ action: 'calculate' }
			)
		).toEqual({
			telemetry_version: 1,
			tool: 'calculator',
			surface: 'standalone_calculator',
			action: 'calculate'
		});
	});
	test('opening, reactivity, question navigation, and closing have distinct semantics', () => {
		const { events, capture } = recorder();
		const track = createToolVisibilityTracker('notes', capture);
		track(false, context);
		track(true, context, 'button');
		track(true, { ...context }, 'button');
		track(true, { ...context, questionId: 'q2' }, 'button');
		track(false, { ...context, questionId: 'q3' });
		track(false, context);
		track(true, context, 'restore');
		expect(events.map(([event]) => event)).toEqual([
			'study_tool_opened',
			'study_tool_question_viewed',
			'study_tool_closed',
			'study_tool_opened'
		]);
		expect(events[2][2].questionId).toBe('q2');
		expect(events[3][3]?.source).toBe('restore');
	});
	test('late evaluation results retain the original question and cannot be double counted by Enter', () => {
		const { events, capture } = recorder();
		const tracker = createCalculationTracker(capture);
		const current = { ...context };
		tracker.start(1, current, { input_method: 'typed' });
		tracker.start(2, current, { input_method: 'mixed' });
		current.questionId = 'q2';
		tracker.record(1, 'success', 'automatic');
		tracker.record(2, 'success', 'automatic');
		tracker.record(2, 'success', 'keyboard');
		expect(events).toHaveLength(1);
		expect(events[0][2].questionId).toBe('q1');
		expect(events[0][3]).toEqual({
			action: 'calculate',
			input_method: 'mixed',
			outcome: 'success',
			source: 'automatic'
		});
	});
	test('failed evaluations count once and a subsequent calculation remains trackable', () => {
		const { events, capture } = recorder();
		const tracker = createCalculationTracker(capture);
		tracker.start(1, context, { input_method: 'formula', formula_id: 'prentice' });
		tracker.record(1, 'timeout', 'automatic');
		tracker.record(1, 'error', 'automatic');
		tracker.start(2, context, { input_method: 'keypad' });
		tracker.record(2, 'success', 'button');
		expect(events.map((e) => e[3]?.outcome)).toEqual(['timeout', 'success']);
	});
	test('SDK loading cannot reattribute events after a question change', async () => {
		const sent: unknown[] = [];
		let ready!: (client: { capture: (event: string, properties: unknown) => void }) => void;
		const client = new Promise<{ capture: (event: string, properties: unknown) => void }>(
			(resolve) => {
				ready = resolve;
			}
		);
		const capture = createStudyToolCapture(() => client);
		const current = { ...context };
		capture('study_tool_used', 'highlight', current, {
			action: 'highlight_changed',
			outcome: 'success',
			ranges_added: 1
		});
		current.questionId = 'q2';
		ready({
			capture: (event, properties) => {
				sent.push({ event, properties });
			}
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(sent).toHaveLength(1);
		expect(sent[0]).toMatchObject({
			properties: { questionId: 'q1', tool: 'highlight', ranges_added: 1 }
		});
	});
	test('missing, rejecting, or throwing analytics clients never interrupt the tool', async () => {
		for (const get of [
			async () => null,
			async () => {
				throw new Error('offline');
			},
			async () => ({
				capture: () => {
					throw new Error('blocked');
				}
			})
		]) {
			expect(() =>
				createStudyToolCapture(get)('study_tool_opened', 'calculator', context)
			).not.toThrow();
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
});
