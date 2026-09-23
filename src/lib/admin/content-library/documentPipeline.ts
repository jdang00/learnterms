import type { Doc } from '../../../convex/_generated/dataModel';

export type PipelineState = 'done' | 'active' | 'idle' | 'error';
export const pipelineLabels = ['Stored', 'Extracted', 'Indexed', 'Mapped'] as const;

export function documentPipeline(metadata: Doc<'contentLib'>['metadata']) {
	const status = metadata?.ingestionStatus ?? 'not_started';
	const stage = metadata?.ingestionStage;
	const states: PipelineState[] = ['done', 'idle', 'idle', 'idle'];
	let label = 'Awaiting processing';
	let current = 1;
	let visible = status !== 'not_started';

	if (status === 'indexing') {
		if (stage === 'indexing') {
			states[1] = 'done';
			states[2] = 'active';
			current = 2;
			label = 'Preparing for search';
		} else if (stage === 'queued') {
			label = 'Queued for extraction';
		} else {
			states[1] = 'active';
			label = 'Extracting text & tables';
		}
	} else if (status === 'failed' || stage === 'failed') {
		// A failed reparse can leave the previous index usable.
		const extracted = Boolean(metadata?.extractionArtifactKeys?.length);
		current = extracted ? 2 : 1;
		if (extracted) states[1] = 'done';
		states[current] = 'error';
		label = 'Processing needs attention';
		visible = true;
	} else if (status === 'mapped') {
		states.fill('done');
		current = 3;
		label = 'Ready';
	} else if (status === 'indexed') {
		states[1] = states[2] = 'done';
		current = 3;
		if (metadata?.topicMapping?.status === 'failed') {
			states[3] = 'error';
			label = 'Topic mapping needs attention';
		} else if (metadata?.topicMapping?.status === 'running') {
			states[3] = 'active';
			label = 'Mapping topics';
		} else {
			label = 'Queued for topic mapping';
		}
	}

	return {
		states,
		label,
		current,
		visible,
		failed: states.includes('error'),
		complete: states.every((state) => state === 'done'),
		active: states.includes('active'),
		description: pipelineLabels.map((name, i) => `${name}: ${states[i]}`).join(' · ')
	};
}
