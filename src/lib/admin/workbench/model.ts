import { Search, FileText, Map, Database } from 'lucide-svelte';
export type Pane = 'tools' | 'rag';
export type ToolId =
	| 'searchSourceChunks'
	| 'getSourcePages'
	| 'getTopicCoverageMap'
	| 'getAllowedSourceText';

export type Citation = {
	citationId: string;
	pageNumber: number;
	noteFile: string;
	chunkTitle: string;
	chunkIndex: number;
};

export type CoverageTopic = {
	topicId: string;
	title: string;
	pageNumbers: number[];
	estimatedQuestionCapacity: number;
	existingQuestionCount: number;
	questionTypes: { learn: number; clinical: number; criticalThinking: number };
	exampleStems: string[];
};

export type DevToolResult = {
	tool: ToolId;
	input: { query?: string; limit?: number; pageNumbers?: number[] };
	output: {
		documentTitle: string;
		query?: string;
		resultCount?: number;
		citations?: Citation[];
		pageNumbers?: number[];
		text?: string;
		existingQuestionCount?: number;
		topics?: CoverageTopic[];
	};
	diagnostics: {
		documentId: string;
		documentTitle: string;
		moduleId?: string;
		pageRange: { startPage: number; endPage: number; selectedPageCount: number };
		topicMapId?: string;
		topicCount: number;
		existingQuestionCount: number;
		elapsedMs: number;
	};
};

export type ToolRun = {
	id: string;
	tool: ToolId;
	at: number;
	result: DevToolResult;
};

export type RagChunk = { text: string; metadata?: Record<string, unknown> };
export type RagRetrievedGroup = {
	entryId: string;
	order: number;
	startOrder: number;
	score: number;
	content: RagChunk[];
};

export type Message = {
	role: 'user' | 'assistant';
	text: string;
	context?: {
		results: RagRetrievedGroup[];
		entries: Array<{ entryId: string; title?: string; key?: string }>;
		text: string;
	};
	usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
	diagnostics?: {
		model: string;
		embeddingModel: string;
		namespace: string;
		search: { limit: number; searchType: string };
		retrievedGroupCount: number;
		entryCount: number;
		contextTextLength: number;
	};
};

export const toolDefinitions: Array<{
	id: ToolId;
	label: string;
	short: string;
	description: string;
	icon: typeof Search;
}> = [
	{
		id: 'searchSourceChunks',
		label: 'searchSourceChunks',
		short: 'Search',
		description: 'Hybrid retrieval across the document namespace — the agent’s evidence gatherer.',
		icon: Search
	},
	{
		id: 'getSourcePages',
		label: 'getSourcePages',
		short: 'Pages',
		description: 'Raw extracted markdown for specific allowed pages — nearby context lookups.',
		icon: FileText
	},
	{
		id: 'getTopicCoverageMap',
		label: 'getTopicCoverageMap',
		short: 'Coverage',
		description: 'Saved topic map scored against existing module questions — gap finder.',
		icon: Map
	},
	{
		id: 'getAllowedSourceText',
		label: 'getAllowedSourceText',
		short: 'Source',
		description: 'The bounded source text the mapping agent is allowed to read.',
		icon: Database
	}
];

export function prettyJson(value: unknown) {
	return JSON.stringify(value, null, 2);
}

export function formatChars(count: number) {
	return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

export function formatTime(at: number) {
	return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function shortId(id: string) {
	return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export function shortModel(model: string) {
	const parts = model.split('/');
	return parts[parts.length - 1];
}

export function parseOptionalNumber(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePageNumbers(value: string) {
	return value
		.split(',')
		.map((part) => Number(part.trim()))
		.filter((pageNumber) => Number.isFinite(pageNumber) && pageNumber > 0)
		.map((pageNumber) => Math.floor(pageNumber));
}

export function splitSourcePages(text: string) {
	return text.split('\n\n---\n\n').map((section) => {
		const match = section.match(/^Page (\d+)\n\n([\s\S]*)$/);
		return match
			? { pageNumber: Number(match[1]), text: match[2] }
			: { pageNumber: null, text: section };
	});
}

export function runSummary(run: ToolRun) {
	const output = run.result.output;
	if (run.tool === 'searchSourceChunks') {
		return `“${run.result.input.query ?? ''}” · ${output.citations?.length ?? 0} citations`;
	}
	if (run.tool === 'getSourcePages') {
		return `pp ${(output.pageNumbers ?? []).join(', ')}`;
	}
	if (run.tool === 'getTopicCoverageMap') {
		return `${output.topics?.length ?? 0} topics · ${output.existingQuestionCount ?? 0} existing questions`;
	}
	return `${output.pageNumbers?.length ?? 0} pages · ${formatChars(output.text?.length ?? 0)} chars`;
}
