<script lang="ts">
	import { captureStudyTool } from '$lib/analytics/studyTools';
	import { useStudyToolContext } from '$lib/analytics/studyToolContext';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Doc } from '../../convex/_generated/dataModel';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import {
		stemFingerprint,
		highlightChange,
		applyHighlightChange,
		type StemHighlight,
		type HighlightChange,
		type HighlightOperation
	} from '$lib/utils/stemHighlights';
	import { onDestroy, tick } from 'svelte';

	let {
		question,
		enabled = false,
		resetVersion = 0
	}: {
		question: Doc<'question'>;
		enabled?: boolean;
		resetVersion?: number;
	} = $props();
	const client = useConvexClient();
	const getTelemetryContext = useStudyToolContext();
	const questionId = $derived(question._id);
	const stem = $derived(question.stem);
	const saved = useQuery(api.stemHighlights.get, () => ({ questionId }));
	let root: HTMLDivElement;
	let version = $state('');
	let busy = $state(false);
	let error = $state('');
	let selectionTimer: ReturnType<typeof setTimeout> | undefined;
	let pointerSelecting = false;
	let touchSelection = false;
	let suppressClickUntil = 0;
	onDestroy(() => clearTimeout(selectionTimer));
	let history = $state<HighlightChange[]>([]);
	let optimistic = $state<StemHighlight[] | null>(null);
	const ranges = $derived(
		optimistic ??
			(saved.data?.questionId === questionId && saved.data.version === version
				? saved.data.ranges
				: [])
	);
	const ready = $derived(
		!!version &&
			saved.data?.questionId === questionId &&
			saved.data.version === version &&
			!busy &&
			!saved.error
	);
	let generation = 0;

	$effect(() => {
		const content = stem;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- tracks a reactive dependency
		questionId;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- tracks a reactive dependency
		resetVersion;
		const current = ++generation;
		version = '';
		history = [];
		optimistic = null;
		clearTimeout(selectionTimer);
		error = '';
		busy = false;
		void stemFingerprint(content).then((value) => {
			if (current === generation) version = value;
		});
	});

	// Paint only this isolated HTML subtree; offsets are based on text nodes, not HTML bytes.
	$effect(() => {
		const html = sanitizeHtml(stem);
		const highlights = ranges;
		if (!root) return;
		// eslint-disable-next-line svelte/no-dom-manipulating -- isolated subtree Svelte never renders into
		root.innerHTML = html;
		const text = root.textContent ?? '';
		const intervals = highlights.filter((r) => text.slice(r.start, r.end) === r.quote);
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		const nodes: Text[] = [];
		while (walker.nextNode()) nodes.push(walker.currentNode as Text);
		let offset = 0;
		for (const node of nodes) {
			const start = offset;
			offset += node.length;
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local, non-reactive
			const cuts = new Set([0, node.length]);
			for (const r of intervals)
				if (r.start < offset && r.end > start) {
					cuts.add(Math.max(0, r.start - start));
					cuts.add(Math.min(node.length, r.end - start));
				}
			const positions = [...cuts].sort((a, b) => a - b);
			const fragment = document.createDocumentFragment();
			for (let i = 0; i < positions.length - 1; i++) {
				const a = positions[i],
					b = positions[i + 1];
				const value = document.createTextNode(node.data.slice(a, b));
				const match = intervals.find((r) => r.start <= start + a && r.end >= start + b);
				if (match) {
					const mark = document.createElement('mark');
					mark.dataset.stemHighlight = match.id;
					mark.append(value);
					fragment.append(mark);
				} else fragment.append(value);
			}
			node.replaceWith(fragment);
		}
	});

	function readSelection(): StemHighlight | undefined {
		if (!enabled || !ready || !root) return;
		const selected = window.getSelection();
		if (!selected?.rangeCount || selected.isCollapsed) return;
		const range = selected.getRangeAt(0);
		if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
		const before = document.createRange();
		before.selectNodeContents(root);
		before.setEnd(range.startContainer, range.startOffset);
		const start = before.toString().length;
		const quote = range.toString();
		if (!quote.trim()) return;
		return { id: crypto.randomUUID(), start, end: start + quote.length, quote };
	}

	async function edit(operation: HighlightOperation, undo = false) {
		if (!ready) return;
		const current = generation;
		const questionId = question._id;
		const telemetryContext = {
			...getTelemetryContext(),
			questionId,
			moduleId: question.moduleId,
			questionType: question.type
		};
		busy = true;
		error = '';
		optimistic = applyHighlightChange(ranges, highlightChange(ranges, operation));
		clearTimeout(selectionTimer);
		window.getSelection()?.removeAllRanges();
		try {
			const change = await client.mutation(api.stemHighlights.edit, {
				questionId,
				version,
				operation
			});
			if (change.added.length || change.removed.length)
				captureStudyTool('study_tool_used', 'highlight', telemetryContext, {
					action: 'highlight_changed',
					outcome: 'success',
					undo,
					ranges_added: change.added.length,
					ranges_removed: change.removed.length
				});
			if (current !== generation) return;
			if (undo) history = history.slice(0, -1);
			else if (change.added.length || change.removed.length)
				history = [...history.slice(-79), change];
			await tick();
		} catch (cause) {
			captureStudyTool('study_tool_used', 'highlight', telemetryContext, {
				action: 'highlight_changed',
				outcome: 'error',
				undo
			});
			if (current === generation)
				error = cause instanceof Error ? cause.message : 'Could not save highlight. Try again.';
		} finally {
			if (current === generation) {
				optimistic = null;
				busy = false;
			}
		}
	}

	function undo() {
		const last = history.at(-1);
		if (last && ready)
			void edit(
				{ type: 'patch', removeIds: last.added.map((r) => r.id), addRanges: last.removed },
				true
			);
	}
	function keydown(event: KeyboardEvent) {
		if (
			event.defaultPrevented ||
			!(event.ctrlKey || event.metaKey) ||
			event.shiftKey ||
			event.altKey ||
			event.key.toLowerCase() !== 'z'
		)
			return;
		if (
			(event.target as HTMLElement)?.closest(
				'input, textarea, [contenteditable="true"], [role="textbox"], dialog'
			)
		)
			return;
		if (!history.length || !ready) return;
		event.preventDefault();
		undo();
	}
	function applySelection() {
		clearTimeout(selectionTimer);
		const selected = readSelection();
		if (selected) {
			suppressClickUntil = Date.now() + 600;
			void edit({ type: 'toggle', range: selected });
		}
	}
	function selectionchange() {
		// Native touch selection handles can finish after pointerup.
		// Wait for the selection to settle without adding a confirmation control.
		clearTimeout(selectionTimer);
		if (enabled && ready && touchSelection && !pointerSelecting) {
			selectionTimer = setTimeout(applySelection, 450);
		}
	}
	function pointerdown(event: PointerEvent) {
		pointerSelecting = true;
		touchSelection = event.pointerType === 'touch';
		clearTimeout(selectionTimer);
	}
	function pointerup() {
		pointerSelecting = false;
		if (touchSelection) selectionchange();
		else applySelection();
	}
	function keyup(event: KeyboardEvent) {
		if (event.key === 'Shift') applySelection();
	}

	function click(event: MouseEvent) {
		if (!enabled || !ready || Date.now() < suppressClickUntil || window.getSelection()?.toString())
			return;
		const mark = (event.target as HTMLElement).closest<HTMLElement>('[data-stem-highlight]');
		const range = ranges.find((r) => r.id === mark?.dataset.stemHighlight);
		if (range) {
			event.preventDefault();
			void edit({ type: 'remove', id: range.id });
		}
	}
</script>

<svelte:document onselectionchange={selectionchange} />
<svelte:window
	onkeydown={keydown}
	onkeyup={keyup}
	onpointerup={pointerup}
	onpointercancel={pointerup}
/>
<!-- Completed pointer and keyboard selections apply highlighting directly. -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	bind:this={root}
	class="stem-text ph-no-capture ph-mask"
	class:highlighting={enabled}
	onpointerdown={pointerdown}
	onclick={click}
></div>
{#if enabled && busy}<span class="sr-only" role="status">Saving highlight…</span>{/if}
{#if error || saved.error}
	<p role="alert" class="mt-2 text-sm font-normal text-error">
		{error || 'Could not load highlights. Reload to try again.'}
	</p>
{/if}
{#if saved.data?.questionId === questionId && saved.data?.stale}
	<p class="mt-2 text-xs font-normal text-base-content/60">
		This stem was updated. Highlights from its previous version are hidden.
	</p>
{/if}

<style>
	.highlighting {
		cursor: text;
		user-select: text;
		-webkit-user-select: text;
	}
	.stem-text :global(mark[data-stem-highlight]) {
		background: #fde047;
		color: #1c1917;
		border-radius: 2px;
		padding: 0;
	}
</style>
