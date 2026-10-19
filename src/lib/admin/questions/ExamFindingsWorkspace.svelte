<script lang="ts">
	import { SegmentedControl } from '#lib/components/ui/segmented-control/index.js';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import Eye from '@lucide/svelte/icons/eye';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Monitor from '@lucide/svelte/icons/monitor';
	import PencilLine from '@lucide/svelte/icons/pencil-line';
	import Plus from '@lucide/svelte/icons/plus';
	import Rows3 from '@lucide/svelte/icons/rows-3';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import { getExamTest, type ExamTest } from '#lib/examFindings/catalog.js';
	import {
		applyNormalValues,
		countExamValues,
		defaultExamValues,
		examFindingTitle,
		MAX_EXAM_FINDINGS,
		type ExamFinding
	} from '#lib/examFindings/findings.js';
	import { WIDE_GRID_COLUMNS } from '#lib/examFindings/view.js';
	import { sanitizeHtml } from '#lib/utils/sanitizeHtml.js';
	import ExamFindings from '#lib/components/exam-findings/ExamFindings.svelte';
	import { EXAM_GROUP_STYLE } from '#lib/components/exam-findings/groups.js';
	import ExamFindingEditorCard from './ExamFindingEditorCard.svelte';
	import ExamFindingsPicker from './ExamFindingsPicker.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		findings = $bindable([]),
		compact = $bindable(false),
		stem = '',
		onBack,
		onChange = () => {},
		disabled = false
	}: {
		findings?: ExamFinding[];
		compact?: boolean;
		stem?: string;
		onBack: () => void;
		onChange?: () => void;
		disabled?: boolean;
	} = $props();

	const motion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 0
			: 1;
	const BONE = 'rounded-full bg-foreground/[0.06]';
	const CAPTION = 'label-caps';

	let mode = $state<'edit' | 'preview'>('edit');
	let device = $state<'desktop' | 'phone'>('desktop');
	let pickerOpen = $state(false);
	let grid = $state<HTMLElement | null>(null);
	let normalNotice = $state('');
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;

	const emptyCount = $derived(findings.filter((finding) => !countExamValues(finding)).length);
	const hasStem = $derived(Boolean(stem.replace(/<[^>]*>/g, '').trim()));
	const full = $derived(findings.length >= MAX_EXAM_FINDINGS);

	function commit() {
		onChange();
	}

	async function focusBox(index: number, scrollOnly = false) {
		await tick();
		const card = grid?.querySelector<HTMLElement>(`[data-index="${index}"]`);
		card?.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'nearest' });
		if (!scrollOnly) card?.querySelector<HTMLElement>('[data-value-input]')?.focus();
	}

	function add(test: string) {
		const entry = getExamTest(test);
		if (!entry) return;
		findings.push({ test, values: defaultExamValues(entry) });
		mode = 'edit';
		commit();
		void focusBox(findings.length - 1);
	}

	function move(from: number, to: number) {
		if (to < 0 || to >= findings.length || from === to) return;
		const [finding] = findings.splice(from, 1);
		findings.splice(to, 0, finding);
		commit();
	}

	function duplicate(index: number) {
		if (full) return;
		const source = findings[index];
		findings.splice(index + 1, 0, {
			test: source.test,
			title: source.title,
			size: source.size,
			values: { ...source.values },
			note: source.note,
			hideInterpretation: source.hideInterpretation
		});
		commit();
		void focusBox(index + 1, true);
	}

	function remove(index: number) {
		findings.splice(index, 1);
		commit();
	}

	function fillAllNormal() {
		let filled = 0;
		for (const finding of findings) {
			const test = getExamTest(finding.test);
			if (test) filled += applyNormalValues(finding, test);
		}
		if (filled) commit();
		clearTimeout(noticeTimer);
		normalNotice = filled
			? `Filled ${filled} ${filled === 1 ? 'field' : 'fields'}`
			: 'Nothing empty';
		noticeTimer = setTimeout(() => (normalNotice = ''), 1800);
	}

	function openInEditor(index: number) {
		mode = 'edit';
		void focusBox(index);
	}

	// Wide layouts and dot diagrams get the full row while editing so inputs stay usable.
	function editsWide(finding: ExamFinding, test: ExamTest) {
		if (finding.size) return finding.size === 'full';
		return test.layout.some(
			(section) =>
				section.kind === 'grid' &&
				(section.display === 'worth4dot' || section.columns.length > WIDE_GRID_COLUMNS)
		);
	}

	// ── drag to arrange by the grip, same feel as the dock customizer ───────
	type Drag = { index: number; x: number; y: number; over: number | null };
	let drag = $state<Drag | null>(null);
	let pending: {
		index: number;
		startX: number;
		startY: number;
		immediate: boolean;
		timer: ReturnType<typeof setTimeout> | null;
	} | null = null;

	function handlePointerDown(event: PointerEvent, index: number) {
		if (event.button !== 0 || disabled) return;
		pending = {
			index,
			startX: event.clientX,
			startY: event.clientY,
			immediate: event.pointerType !== 'touch',
			timer: null
		};
		if (!pending.immediate)
			pending.timer = setTimeout(() => startDrag(event.clientX, event.clientY), 220);
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		window.addEventListener('pointercancel', cancelDrag);
		window.addEventListener('touchmove', blockScroll, { passive: false });
	}

	function startDrag(x: number, y: number) {
		if (!pending) return;
		drag = { index: pending.index, x, y, over: pending.index };
		if (!pending.immediate) navigator.vibrate?.(8);
	}

	function handlePointerMove(event: PointerEvent) {
		if (drag) {
			drag.x = event.clientX;
			drag.y = event.clientY;
			drag.over = hitTest(event.clientX, event.clientY);
			return;
		}
		if (!pending) return;
		const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
		if (pending.immediate && distance > 4) startDrag(event.clientX, event.clientY);
		else if (!pending.immediate && distance > 10) cancelDrag();
	}

	function handlePointerUp() {
		if (drag && drag.over !== null) move(drag.index, drag.over);
		cancelDrag();
	}

	function cancelDrag() {
		if (pending?.timer) clearTimeout(pending.timer);
		pending = null;
		drag = null;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		window.removeEventListener('pointercancel', cancelDrag);
		window.removeEventListener('touchmove', blockScroll);
	}

	function blockScroll(event: TouchEvent) {
		if (drag) event.preventDefault();
	}

	function hitTest(x: number, y: number) {
		if (!grid) return null;
		const rect = grid.getBoundingClientRect();
		const slack = 40;
		if (
			x < rect.left - slack ||
			x > rect.right + slack ||
			y < rect.top - slack ||
			y > rect.bottom + slack
		)
			return null;
		const cards = grid.querySelectorAll<HTMLElement>('[data-card]');
		for (let i = 0; i < cards.length; i++) {
			const card = cards[i].getBoundingClientRect();
			if (y < card.top) return i;
			if (y <= card.bottom && x < card.left + card.width / 2) return i;
		}
		return cards.length;
	}

	type StageEntry = { kind: 'card'; finding: ExamFinding; index: number } | { kind: 'placeholder' };
	const entries = $derived.by(() => {
		let list: StageEntry[] = findings.map((finding, index) => ({ kind: 'card', finding, index }));
		if (drag) {
			list = list.filter((entry) => entry.kind !== 'card' || entry.index !== drag!.index);
			if (drag.over !== null) list.splice(drag.over, 0, { kind: 'placeholder' });
		}
		return list;
	});
	const dragged = $derived(drag ? findings[drag.index] : null);
	const draggedTest = $derived(dragged ? getExamTest(dragged.test) : undefined);
	const draggedWide = $derived(dragged && draggedTest ? editsWide(dragged, draggedTest) : false);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && drag) cancelDrag();
	}}
/>

<div
	class="@container flex h-full min-h-0 flex-col bg-background"
	in:fade={{ duration: 160 * motion }}
>
	<header class="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border px-4 py-2.5">
		<Button variant="ghost" tone="neutral" size="sm" class="gap-1.5 pl-2" onclick={onBack}>
			<ArrowLeft size={16} /> Question
		</Button>
		<span class="hidden h-6 w-px bg-muted-strong @md:block"></span>
		<div class="min-w-40 flex-1">
			<div class="flex items-center gap-2">
				<h3 class="truncate font-semibold tracking-tight">Exam findings</h3>
				<Badge variant="soft" tone="info" size="xs">Beta</Badge>
			</div>
			<p class="truncate text-xs text-foreground/55">
				{#if findings.length}
					<span class="tabular-nums">{findings.length}</span>
					{findings.length === 1 ? 'box' : 'boxes'}{#if emptyCount}
						· <span class="tabular-nums">{emptyCount}</span> hidden until filled{/if}
				{:else}
					Chart boxes under the stem, for any question type
				{/if}
			</p>
		</div>

		<SegmentedControl
			aria-label="Workspace view"
			value={mode}
			onValueChange={(value) => (mode = value as typeof mode)}
			options={[
				{ value: 'edit', label: 'Edit', icon: PencilLine },
				{ value: 'preview', label: 'Preview', icon: Eye }
			]}
			size="xs"
			activeVariant="soft"
			track="muted"
			class="shrink-0"
			itemClass="gap-1.5 px-3"
			labelClass="hidden @2xl:inline"
		/>

		{#if mode === 'edit'}
			{#if findings.length}
				<Button
					variant="soft"
					tone="success"
					size="sm"
					class="shrink-0 gap-1.5"
					tooltip="Fill every empty field that has a normal finding"
					onclick={fillAllNormal}
					{disabled}
				>
					<CheckCheck size={15} />
					<span class="tabular-nums">{normalNotice || 'All normal'}</span>
				</Button>
			{/if}
		{:else}
			<SegmentedControl
				aria-label="Box style"
				value={compact ? 'compact' : 'cards'}
				onValueChange={(value) => {
					compact = value === 'compact';
					commit();
				}}
				options={[
					{ value: 'cards', label: 'Cards', icon: LayoutGrid },
					{ value: 'compact', label: 'Compact', icon: Rows3 }
				]}
				size="xs"
				activeVariant="soft"
				track="muted"
				class="shrink-0"
				itemClass="gap-1.5 px-3"
				labelClass="hidden @2xl:inline"
			/>
			<SegmentedControl
				aria-label="Preview on"
				value={device}
				onValueChange={(value) => (device = value as typeof device)}
				options={[
					{ value: 'desktop', label: 'Desktop', icon: Monitor },
					{ value: 'phone', label: 'Phone', icon: Smartphone }
				]}
				size="xs"
				activeVariant="soft"
				track="muted"
				class="shrink-0"
				itemClass="gap-1.5 px-3"
				labelClass="hidden @2xl:inline"
			/>
		{/if}

		<Button
			size="sm"
			class="shrink-0 gap-1.5"
			disabled={disabled || full}
			onclick={() => (pickerOpen = true)}
		>
			<Plus size={15} /> Add findings
		</Button>
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto p-4">
		<div class="graph-stage flex min-h-full flex-col surface-muted px-3 py-4 @md:px-5">
			{#if findings.length === 0}
				<button
					type="button"
					class="group m-auto flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-background/70 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
					onclick={() => (pickerOpen = true)}
					{disabled}
				>
					<span class="flex -space-x-2" aria-hidden="true">
						{#each Object.values(EXAM_GROUP_STYLE) as style, i (i)}
							<span
								class="grid size-9 place-items-center rounded-full ring-2 ring-background transition-transform duration-300 group-hover:-translate-y-0.5 {style.badge}"
								style="transition-delay: {i * 40}ms"
							>
								<style.icon size={16} />
							</span>
						{/each}
					</span>
					<span class="text-base font-semibold">Build the chart students read</span>
					<span class="max-w-xs text-sm text-foreground/55">
						Visual acuity, refraction, slit lamp, IOP and more. One tap fills normal findings; only
						what you record shows up.
					</span>
					<span
						class="mt-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-xs"
					>
						<Plus size={14} /> Add findings
					</span>
				</button>
			{:else if mode === 'edit'}
				<div
					bind:this={grid}
					class="@container grid grid-cols-1 gap-3 @4xl:grid-cols-2"
					role="list"
					aria-label="Exam findings"
				>
					{#each entries as entry (entry.kind === 'card' ? entry.finding : 'placeholder')}
						{@const test = entry.kind === 'card' ? getExamTest(entry.finding.test) : undefined}
						{@const wide =
							entry.kind === 'placeholder'
								? draggedWide
								: test
									? editsWide(entry.finding, test)
									: false}
						<div
							role="listitem"
							class="min-w-0 {wide ? '@4xl:col-span-2' : ''}"
							data-card={entry.kind === 'card' ? '' : undefined}
							data-index={entry.kind === 'card' ? entry.index : undefined}
							animate:flip={{ duration: 240 * motion, easing: cubicOut }}
							in:scale={{ start: 0.92, duration: 260 * motion, easing: backOut }}
						>
							{#if entry.kind === 'placeholder'}
								<div
									class="h-full min-h-32 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10"
								></div>
							{:else if test}
								<ExamFindingEditorCard
									finding={entry.finding}
									{test}
									index={entry.index}
									total={findings.length}
									canDuplicate={!full}
									{disabled}
									onChange={commit}
									onMove={(delta) => move(entry.index, entry.index + delta)}
									onDuplicate={() => duplicate(entry.index)}
									onRemove={() => remove(entry.index)}
									onHandlePointerDown={(event) => handlePointerDown(event, entry.index)}
								/>
							{/if}
						</div>
					{/each}
					{#if !full && !drag}
						<button
							type="button"
							class="flex min-h-24 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-foreground/50 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary-ink"
							onclick={() => (pickerOpen = true)}
							{disabled}
						>
							<Plus size={16} /> Add findings
						</button>
					{/if}
				</div>
			{:else}
				<p class="{CAPTION} mb-2 {device === 'phone' ? 'text-center' : 'px-1'}">
					Student view · {device === 'phone' ? 'Phone' : 'Desktop'}
				</p>
				<div
					class="@container mx-auto w-full bg-background transition-[max-width,border-radius] duration-300 {device ===
					'phone'
						? 'max-w-[23rem] rounded-[2rem] border-[3px] border-foreground/10 px-4 pb-6 pt-5'
						: 'max-w-none rounded-2xl border border-dashed border-foreground/15 p-4 @md:p-5'}"
				>
					{#if hasStem}
						<div class="tiptap-content line-clamp-3 text-base font-medium leading-snug">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html sanitizeHtml(stem)}
						</div>
					{:else}
						<div class="space-y-2" aria-label="Question stem (empty)">
							<span class="block h-2.5 w-11/12 {BONE}"></span>
							<span class="block h-2.5 w-2/3 {BONE}"></span>
						</div>
					{/if}
					<ExamFindings {findings} {compact} reveal={false} onOpen={openInEditor} />
					{#if emptyCount}
						<p class="text-center text-xs text-foreground/45">
							{emptyCount} empty {emptyCount === 1 ? 'box is' : 'boxes are'} hidden from students.
						</p>
					{/if}
					<div class="mt-5 space-y-2" aria-hidden="true">
						{#each [46, 34] as width (width)}
							<span
								class="flex h-9 items-center gap-2.5 rounded-full border border-foreground/10 px-3"
							>
								<span class="size-3.5 shrink-0 rounded-full border border-foreground/15"></span>
								<span class="h-2 {BONE}" style="width: {width}%"></span>
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

{#if drag && dragged}
	{@const style = draggedTest ? EXAM_GROUP_STYLE[draggedTest.group] : null}
	<div
		class="pointer-events-none fixed left-0 top-0 z-[100]"
		style="transform: translate3d({drag.x}px, {drag.y}px, 0);"
	>
		<div
			class="flex -translate-x-1/2 -translate-y-1/2 -rotate-3 items-center gap-2 whitespace-nowrap rounded-full border bg-background px-3.5 py-2 text-sm font-medium shadow-2xl {drag.over !==
			null
				? 'border-primary/50 ring-4 ring-primary/15'
				: 'border-border'}"
			in:scale={{ start: 0.7, duration: 180 * motion, easing: backOut }}
		>
			{#if style}
				<span class="grid size-5 place-items-center rounded-full {style.badge}">
					<style.icon size={11} />
				</span>
			{/if}
			{examFindingTitle(dragged)}
		</div>
	</div>
{/if}

<ExamFindingsPicker bind:open={pickerOpen} {findings} onAdd={add} />
