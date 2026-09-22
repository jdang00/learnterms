export type StudyTool = 'notes' | 'highlight' | 'calculator';
export type StudyToolContext = {
	surface: 'module_quiz' | 'test_attempt' | 'standalone_calculator' | 'other';
	pathname?: string;
	questionId?: string;
	moduleId?: string;
	classId?: string;
	attemptId?: string;
	questionType?: string;
};
export type StudyToolEvent =
	| 'study_tool_opened'
	| 'study_tool_closed'
	| 'study_tool_question_viewed'
	| 'study_tool_used';
export type StudyToolDetails = {
	action?:
		| 'mode_changed'
		| 'edit_started'
		| 'created'
		| 'updated'
		| 'cleared'
		| 'save'
		| 'conflict_resolved'
		| 'format'
		| 'limit_reached'
		| 'highlight_changed'
		| 'calculate'
		| 'formula_selected'
		| 'formulas_opened'
		| 'angle_changed'
		| 'result_copied'
		| 'history_reused'
		| 'history_cleared'
		| 'load';
	outcome?: 'success' | 'error' | 'conflict' | 'invalid' | 'timeout';
	source?: 'button' | 'keyboard' | 'mobile' | 'restore' | 'navigation' | 'standalone' | 'automatic';
	input_method?: 'typed' | 'keypad' | 'mixed' | 'formula' | 'history' | 'restored';
	enabled?: boolean;
	character_count?: number;
	ranges_added?: number;
	ranges_removed?: number;
	undo?: boolean;
	format?: 'bold' | 'italic' | 'underline' | 'bulletList' | 'orderedList';
	resolution?: 'saved' | 'local';
	formula_id?: string;
	angle_mode?: 'deg' | 'rad';
};

// Explicit allowlist: never spread documents, selections, expressions, results, or errors into events.
export function studyToolProperties(
	tool: StudyTool,
	context: StudyToolContext,
	details: StudyToolDetails = {}
) {
	return Object.fromEntries(
		Object.entries({
			telemetry_version: 1,
			tool,
			surface: context.surface,
			pathname: context.pathname?.split(/[?#]/)[0],
			questionId: context.questionId,
			moduleId: context.moduleId,
			classId: context.classId,
			attemptId: context.attemptId,
			questionType: context.questionType,
			action: details.action,
			outcome: details.outcome,
			source: details.source,
			input_method: details.input_method,
			enabled: details.enabled,
			character_count: details.character_count,
			ranges_added: details.ranges_added,
			ranges_removed: details.ranges_removed,
			undo: details.undo,
			format: details.format,
			resolution: details.resolution,
			formula_id: details.formula_id,
			angle_mode: details.angle_mode
		}).filter(([, value]) => value !== undefined)
	);
}

export type ToolCapture = (
	event: StudyToolEvent,
	tool: StudyTool,
	context: StudyToolContext,
	details?: StudyToolDetails
) => void;

type CaptureClient = { capture: (event: string, properties: Record<string, unknown>) => unknown };
export function createStudyToolCapture(
	getClient: () => Promise<CaptureClient | null>
): ToolCapture {
	return (event, tool, context, details) => {
		const properties = studyToolProperties(tool, context, details);
		void Promise.resolve()
			.then(getClient)
			.then((client) => client?.capture(event, properties))
			.catch(() => {
				// Analytics must never interrupt studying or expose user content in error logs.
			});
	};
}

export function createCalculationTracker(capture: ToolCapture) {
	let pending: { id: number; context: StudyToolContext; details: StudyToolDetails } | undefined;
	return {
		start(id: number, context: StudyToolContext, details: StudyToolDetails) {
			pending = { id, context: { ...context }, details: { ...details } };
		},
		record(id: number, outcome: StudyToolDetails['outcome'], source: StudyToolDetails['source']) {
			if (!pending || pending.id !== id) return;
			const evaluation = pending;
			pending = undefined;
			capture('study_tool_used', 'calculator', evaluation.context, {
				...evaluation.details,
				action: 'calculate',
				outcome,
				source
			});
		}
	};
}

// One open per visibility transition. Navigating with a panel open is a view, not another open.
export function createToolVisibilityTracker(tool: StudyTool, capture: ToolCapture) {
	let previous: StudyToolContext | undefined;
	return (
		visible: boolean,
		context: StudyToolContext,
		source: StudyToolDetails['source'] = 'automatic'
	) => {
		if (visible && !previous) capture('study_tool_opened', tool, context, { source });
		else if (visible && previous && JSON.stringify(context) !== JSON.stringify(previous)) {
			capture('study_tool_question_viewed', tool, context, { source: 'navigation' });
		} else if (!visible && previous) capture('study_tool_closed', tool, previous);
		previous = visible ? { ...context } : undefined;
	};
}
