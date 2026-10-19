<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import Check from '@lucide/svelte/icons/check';
	import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import {
		EXAM_TEST_GROUPS,
		EXAM_TESTS,
		getExamTest,
		type ExamSection,
		type ExamTestGroup
	} from '$lib/examFindings/catalog';
	import {
		MAX_EXAM_FINDINGS,
		sampleExamFinding,
		type ExamFinding
	} from '$lib/examFindings/findings';
	import { buildExamFindingView } from '$lib/examFindings/view';
	import ExamFindingCard from '$lib/components/exam-findings/ExamFindingCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Kbd } from '$lib/components/ui/kbd';
	import { EXAM_GROUP_STYLE } from '$lib/components/exam-findings/groups';

	let {
		open = $bindable(false),
		findings,
		onAdd
	}: { open?: boolean; findings: ExamFinding[]; onAdd: (test: string) => void } = $props();

	let searchInput = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLElement | null>(null);
	let query = $state('');
	let activeId = $state(EXAM_TESTS[0].id);

	const full = $derived(findings.length >= MAX_EXAM_FINDINGS);
	const addedCount = $derived(
		findings.reduce<Record<string, number>>((counts, finding) => {
			counts[finding.test] = (counts[finding.test] ?? 0) + 1;
			return counts;
		}, {})
	);

	const matches = $derived.by(() => {
		const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		return EXAM_TESTS.filter((entry) => {
			const haystack = `${entry.title} ${EXAM_TEST_GROUPS[entry.group]}`.toLowerCase();
			return terms.every((term) => haystack.includes(term));
		});
	});
	const groups = $derived(
		(Object.keys(EXAM_TEST_GROUPS) as ExamTestGroup[])
			.map((group) => ({
				group,
				label: EXAM_TEST_GROUPS[group],
				tests: matches.filter((entry) => entry.group === group)
			}))
			.filter((group) => group.tests.length)
	);

	const active = $derived(
		matches.find((entry) => entry.id === activeId) ?? matches[0] ?? getExamTest(activeId)
	);
	const preview = $derived(active ? buildExamFindingView(sampleExamFinding(active)) : null);
	const siblings = $derived(
		active
			? EXAM_TESTS.filter((entry) => entry.layout === active.layout && entry.id !== active.id)
			: []
	);

	function describe(section: ExamSection) {
		if (section.kind === 'note') return section.label;
		if (section.kind === 'fields') return section.fields.map((f) => f.label).join(' · ');
		if (section.display === 'worth4dot')
			return `${section.rows.map((r) => r.label).join(' / ')} dot diagrams you can drag`;
		return `${section.rows.map((r) => r.label).join(' / ')} × ${section.columns.map((c) => c.label).join(', ')}`;
	}

	$effect(() => {
		if (open) query = '';
	});

	function add(id = active?.id) {
		if (!id || full) return;
		onAdd(id);
		open = false;
	}

	function step(delta: number) {
		if (!matches.length) return;
		const index = matches.findIndex((entry) => entry.id === active?.id);
		const next = matches[(index + delta + matches.length) % matches.length];
		activeId = next.id;
		void tick().then(() =>
			listEl?.querySelector(`[data-test="${next.id}"]`)?.scrollIntoView({ block: 'nearest' })
		);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') step(1);
		else if (event.key === 'ArrowUp') step(-1);
		else if (event.key === 'Enter' && !event.isComposing) add();
		else return;
		event.preventDefault();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		sheet
		class="flex h-[min(40rem,88dvh)] flex-col gap-0 overflow-hidden border p-0 shadow-2xl sm:max-w-4xl"
		showCloseButton={false}
		onOpenAutoFocus={(event) => {
			event.preventDefault();
			searchInput?.focus();
		}}
	>
		<header class="flex items-center gap-3 border-b border-muted px-5 pb-3 pt-4">
			<div class="min-w-0 flex-1">
				<Dialog.Title id="exam-picker-title" class="text-lg font-semibold tracking-tight"
					>Add findings</Dialog.Title
				>
				<p class="text-sm text-foreground/55">
					Pick a test. Each box records only what you fill in.
				</p>
			</div>
			<Button
				variant="ghost"
				tone="neutral"
				size="sm"
				shape="circle"
				aria-label="Close"
				onclick={() => (open = false)}><X size={16} /></Button
			>
		</header>

		<div class="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] sm:grid-cols-[17rem_minmax(0,1fr)]">
			<!-- List -->
			<div class="flex min-h-0 flex-col border-muted sm:border-r">
				<div class="px-3 pt-3">
					<InputGroup.Root class="h-8 w-full bg-muted/50 focus-within:bg-background">
						<InputGroup.Addon>
							<Search size={14} class="text-foreground/45" />
						</InputGroup.Addon>
						<InputGroup.Input
							bind:ref={searchInput}
							type="search"
							placeholder="Search tests"
							aria-label="Search tests"
							aria-controls="exam-picker-list"
							bind:value={query}
							onkeydown={handleKeydown}
						/>
					</InputGroup.Root>
				</div>
				<div
					id="exam-picker-list"
					bind:this={listEl}
					role="listbox"
					aria-label="Tests"
					tabindex="-1"
					class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2"
				>
					{#each groups as group (group.group)}
						<p class="px-2.5 pb-1 pt-3 label-caps first:pt-1">
							{group.label}
						</p>
						{#each group.tests as entry (entry.id)}
							{@const style = EXAM_GROUP_STYLE[entry.group]}
							{@const selected = entry.id === active?.id}
							<button
								type="button"
								role="option"
								aria-selected={selected}
								data-test={entry.id}
								class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors {selected
									? 'bg-muted font-semibold'
									: 'hover:bg-muted/60'}"
								onclick={() => (activeId = entry.id)}
								ondblclick={() => add(entry.id)}
							>
								<span class="grid size-6 shrink-0 place-items-center rounded-full {style.badge}">
									<style.icon size={12} />
								</span>
								<span class="min-w-0 flex-1 truncate">{entry.title}</span>
								{#if addedCount[entry.id]}
									<span
										class="flex items-center gap-0.5 text-[0.7rem] font-medium text-success-ink"
										title="Already on this question"
									>
										<Check size={12} />{addedCount[entry.id] > 1 ? addedCount[entry.id] : ''}
									</span>
								{/if}
							</button>
						{/each}
					{:else}
						<p class="px-3 py-10 text-center text-sm text-foreground/50">
							No tests match “{query}”.
						</p>
					{/each}
				</div>
			</div>

			<!-- Preview -->
			<div class="graph-stage hidden min-h-0 flex-col bg-muted/40 sm:flex">
				{#if active && preview}
					{#key active.id}
						<div class="min-h-0 flex-1 overflow-y-auto p-5" in:fade={{ duration: 140 }}>
							<p class="mb-2 label-caps">Preview · sample values</p>
							<div class="mx-auto max-w-md">
								<ExamFindingCard view={preview} class="shadow-md" />
							</div>
							<dl class="mx-auto mt-5 max-w-md space-y-2 text-xs">
								<div>
									<dt class="font-semibold text-foreground/60">Records</dt>
									{#each active.layout as section, index (index)}
										<dd class="text-foreground/55">{describe(section)}</dd>
									{/each}
								</div>
								{#if siblings.length}
									<div>
										<dt class="font-semibold text-foreground/60">Same layout as</dt>
										<dd class="text-foreground/55">
											{siblings.map((entry) => entry.title).join(', ')}
										</dd>
									</div>
								{/if}
							</dl>
						</div>
					{/key}
				{/if}
				<footer
					class="flex items-center justify-between gap-3 border-t border-muted bg-background/80 px-5 py-3 backdrop-blur"
				>
					<span class="hidden text-xs text-foreground/45 md:inline">
						<Kbd>↑</Kbd><Kbd>↓</Kbd> to browse ·
						<Kbd>Enter</Kbd> to add
					</span>
					<Button size="sm" class="ml-auto px-4" disabled={!active || full} onclick={() => add()}>
						<Plus size={14} />
						{full ? `Limit of ${MAX_EXAM_FINDINGS} boxes` : `Add ${active?.title ?? ''}`}
						<CornerDownLeft size={12} class="opacity-60" />
					</Button>
				</footer>
			</div>
		</div>

		<!-- Phones skip the preview; tapping a test adds it. -->
		<div class="border-t border-muted p-3 sm:hidden">
			<Button class="w-full" disabled={!active || full} onclick={() => add()}>
				<Plus size={16} /> Add {active?.title ?? ''}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
