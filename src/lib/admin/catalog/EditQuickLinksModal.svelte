<script lang="ts">
	import QuickLinksList from './QuickLinksList.svelte';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import type { QuickLinkItem } from '$lib/components/power-bar/types';
	import {
		ArrowDown,
		ArrowUp,
		Eye,
		EyeOff,
		ExternalLink,
		Link2,
		Plus,
		RotateCcw,
		Trash2,
		TriangleAlert,
		X
	} from 'lucide-svelte';

	interface Props {
		isOpen?: boolean;
		close: () => void;
		cohortId?: Id<'cohort'>;
	}

	let { isOpen = false, close, cohortId }: Props = $props();

	const client = useConvexClient();
	const quickLinksQuery = useQuery(api.cohort.getQuickLinksForCohortAdmin, () =>
		isOpen && cohortId ? { cohortId } : 'skip'
	);

	const EMOJI_SUGGESTIONS = [
		'🔗',
		'📚',
		'📝',
		'📅',
		'🎓',
		'📊',
		'💬',
		'⭐',
		'🧪',
		'📁',
		'▶️',
		'🔬'
	];

	let draftLinks = $state<QuickLinkItem[]>([]);
	let selectedIndex = $state(0);
	let hydratedCohortId = $state('');
	let isSubmitting = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (!isOpen) {
			hydratedCohortId = '';
			submitError = '';
			return;
		}
		if (!cohortId || !quickLinksQuery.data || hydratedCohortId === cohortId) return;

		draftLinks = quickLinksQuery.data.links.map((link) => ({ ...link }));
		selectedIndex = 0;
		hydratedCohortId = cohortId;
	});

	const selectedLink = $derived(draftLinks[selectedIndex]);

	function isValidHref(href: string) {
		const trimmed = href.trim();
		return (
			(trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
			trimmed.startsWith('https://') ||
			trimmed.startsWith('http://')
		);
	}

	function linkError(link: QuickLinkItem) {
		if (!link.title.trim()) return 'Needs a title';
		if (link.title.trim().length > 60) return 'Title is too long';
		if (link.description.trim().length > 120) return 'Description is too long';
		if (!link.href.trim()) return 'Needs a destination';
		if (!isValidHref(link.href)) return 'Destination must start with /, https://, or http://';
		if (!link.icon.trim()) return 'Needs an icon';
		if (link.icon.trim().length > 12) return 'Icon is too long';
		return '';
	}

	const validationError = $derived.by(() => {
		if (draftLinks.length > 12) return 'Quick links cannot exceed 12 items';
		for (const [index, link] of draftLinks.entries()) {
			const error = linkError(link);
			if (error) return `Link ${index + 1}: ${error}`;
		}
		return '';
	});

	function updateLink(index: number, field: keyof QuickLinkItem, value: string) {
		draftLinks = draftLinks.map((link, linkIndex) =>
			linkIndex === index ? { ...link, [field]: value } : link
		);
	}

	function addLink() {
		draftLinks = [
			...draftLinks,
			{
				title: 'New Link',
				description: 'Describe where this opens',
				href: '/classes',
				icon: '🔗',
				hidden: false
			}
		];
		selectedIndex = draftLinks.length - 1;
	}

	function removeLink(index: number) {
		draftLinks = draftLinks.filter((_, linkIndex) => linkIndex !== index);
		selectedIndex = Math.max(0, Math.min(selectedIndex, draftLinks.length - 1));
	}

	function reorderLink(from: number, to: number) {
		if (to < 0 || to >= draftLinks.length || from === to) return;
		const next = [...draftLinks];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		draftLinks = next;
		selectedIndex = to;
	}

	function setLinkHidden(index: number, hidden: boolean) {
		draftLinks = draftLinks.map((link, linkIndex) =>
			linkIndex === index ? { ...link, hidden } : link
		);
		selectedIndex = index;
	}

	function resetToDefaults() {
		if (!quickLinksQuery.data) return;
		draftLinks = quickLinksQuery.data.defaultLinks.map((link) => ({ ...link }));
		selectedIndex = 0;
		submitError = '';
	}

	const isExternalLink = (href: string) => href.trim().startsWith('http');

	async function saveQuickLinks() {
		if (!cohortId || validationError) return;

		isSubmitting = true;
		submitError = '';

		try {
			await client.mutation(api.cohort.updateQuickLinksForCohort, {
				cohortId,
				quickLinks: draftLinks.map((link) => ({
					title: link.title.trim(),
					description: link.description.trim(),
					href: link.href.trim(),
					icon: link.icon.trim(),
					hidden: link.hidden === true
				}))
			});
			close();
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to save quick links';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<dialog
	class="modal p-4"
	class:modal-open={isOpen}
	onclick={(event) => {
		if (event.target === event.currentTarget) close();
	}}
>
	<div
		class="modal-box flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-base-300 p-0 shadow-2xl"
	>
		<div class="flex items-center justify-between gap-4 border-b border-base-300 px-6 py-4">
			<div class="flex items-center gap-3">
				<div class="rounded-2xl bg-primary/10 p-2.5 text-primary ring-1 ring-inset ring-primary/15">
					<Link2 size={20} />
				</div>
				<div>
					<h3 class="text-lg font-bold leading-tight">Quick Links</h3>
					<p class="text-xs text-base-content/55">
						Shown to this cohort in the sidebar and command menu
					</p>
				</div>
			</div>
			<button class="btn btn-ghost btn-sm btn-circle" onclick={close} aria-label="Close">
				<X size={18} />
			</button>
		</div>

		{#if quickLinksQuery.isLoading}
			<div class="flex items-center gap-3 px-6 py-16 text-base-content/70">
				<span class="loading loading-spinner loading-md"></span>
				<span>Loading quick links…</span>
			</div>
		{:else if quickLinksQuery.error}
			<div class="p-6">
				<div class="alert alert-error">
					<span>{quickLinksQuery.error.toString()}</span>
				</div>
			</div>
		{:else}
			<div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[16rem_1fr]">
				<QuickLinksList bind:draftLinks bind:selectedIndex {linkError} {setLinkHidden} {addLink} />
				<div class="min-h-0 overflow-y-auto">
					{#if !selectedLink}
						<div
							class="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 p-8 text-center"
						>
							<div class="rounded-2xl bg-base-200 p-4 text-base-content/40">
								<Link2 size={28} />
							</div>
							<div>
								<p class="font-semibold">No quick links yet</p>
								<p class="mt-1 text-sm text-base-content/55">Add your first link to get started.</p>
							</div>
							<button class="btn btn-primary btn-sm gap-2 rounded-full" onclick={addLink}>
								<Plus size={16} />
								<span>Add quick link</span>
							</button>
						</div>
					{:else}
						<div class="space-y-5 p-5">
							<div class="rounded-2xl border border-base-300 bg-base-200/40 p-3">
								<div class="rounded-2xl bg-base-100 p-2 shadow-xs ring-1 ring-base-300/60">
									<div class="flex w-full items-center gap-3 rounded-full px-3 py-2.5">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-base-200 text-sm"
										>
											{selectedLink.icon || '🔗'}
										</span>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-[13px] font-semibold leading-snug">
												{selectedLink.title || 'Untitled link'}
											</span>
											<span class="block truncate text-[11px] text-base-content/50">
												{selectedLink.description || 'No description'}
											</span>
										</span>
										<ExternalLink size={13} class="shrink-0 text-base-content/30" />
									</div>
								</div>
							</div>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-base-content/45">
										Editing link {selectedIndex + 1}
									</span>
									<span
										class="badge badge-xs rounded-full {selectedLink.hidden
											? 'badge-ghost'
											: 'badge-primary badge-soft'}"
									>
										{selectedLink.hidden ? 'Hidden' : 'Shown'}
									</span>
								</div>
								<div class="flex items-center gap-1">
									<button
										class="btn btn-ghost btn-xs gap-1 rounded-full"
										onclick={() => setLinkHidden(selectedIndex, !selectedLink.hidden)}
										aria-label={selectedLink.hidden ? 'Show link' : 'Hide link'}
									>
										{#if selectedLink.hidden}
											<Eye size={14} />
											<span>Show</span>
										{:else}
											<EyeOff size={14} />
											<span>Hide</span>
										{/if}
									</button>
									<button
										class="btn btn-ghost btn-xs btn-circle"
										onclick={() => reorderLink(selectedIndex, selectedIndex - 1)}
										disabled={selectedIndex === 0}
										aria-label="Move up"
									>
										<ArrowUp size={15} />
									</button>
									<button
										class="btn btn-ghost btn-xs btn-circle"
										onclick={() => reorderLink(selectedIndex, selectedIndex + 1)}
										disabled={selectedIndex === draftLinks.length - 1}
										aria-label="Move down"
									>
										<ArrowDown size={15} />
									</button>
									<button
										class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
										onclick={() => removeLink(selectedIndex)}
										aria-label="Delete link"
									>
										<Trash2 size={15} />
									</button>
								</div>
							</div>
							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<span class="text-xs font-medium text-base-content/70">Icon</span>
									<span class="text-[10px] text-base-content/40">
										{selectedLink.icon.length}/12
									</span>
								</div>
								<div class="flex items-center gap-3">
									<span
										class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-base-300 bg-base-200 text-xl"
									>
										{selectedLink.icon || '🔗'}
									</span>
									<input
										class="input input-bordered input-sm flex-1 rounded-xl"
										value={selectedLink.icon}
										maxlength="12"
										placeholder="🔗"
										oninput={(event) =>
											updateLink(selectedIndex, 'icon', event.currentTarget.value)}
									/>
								</div>
								<div class="mt-2 flex flex-wrap gap-1">
									{#each EMOJI_SUGGESTIONS as emoji (emoji)}
										<button
											class="flex h-8 w-8 items-center justify-center rounded-lg border text-base transition hover:bg-base-200
												{selectedLink.icon === emoji ? 'border-primary/50 bg-primary/10' : 'border-base-300'}"
											onclick={() => updateLink(selectedIndex, 'icon', emoji)}
											aria-label={`Use ${emoji}`}
										>
											{emoji}
										</button>
									{/each}
								</div>
							</div>
							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<span class="text-xs font-medium text-base-content/70">Title</span>
									<span class="text-[10px] text-base-content/40">
										{selectedLink.title.length}/60
									</span>
								</div>
								<input
									class="input input-bordered input-sm w-full rounded-xl"
									value={selectedLink.title}
									maxlength="60"
									placeholder="e.g. Course Syllabus"
									oninput={(event) => updateLink(selectedIndex, 'title', event.currentTarget.value)}
								/>
							</div>
							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<span class="text-xs font-medium text-base-content/70">Destination</span>
									{#if selectedLink.href.trim()}
										<span class="text-[10px] font-medium text-base-content/40">
											{isExternalLink(selectedLink.href) ? 'External link' : 'Internal page'}
										</span>
									{/if}
								</div>
								<input
									class="input input-bordered input-sm w-full rounded-xl font-mono text-[13px]"
									value={selectedLink.href}
									maxlength="240"
									placeholder="/classes or https://example.com"
									oninput={(event) => updateLink(selectedIndex, 'href', event.currentTarget.value)}
								/>
								<p class="mt-1 text-[10px] text-base-content/40">
									Start with <code class="rounded bg-base-200 px-1">/</code> for an internal page or
									<code class="rounded bg-base-200 px-1">https://</code> for an external site.
								</p>
							</div>
							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<span class="text-xs font-medium text-base-content/70">Description</span>
									<span class="text-[10px] text-base-content/40">
										{selectedLink.description.length}/120
									</span>
								</div>
								<input
									class="input input-bordered input-sm w-full rounded-xl"
									value={selectedLink.description}
									maxlength="120"
									placeholder="Short note about where this goes"
									oninput={(event) =>
										updateLink(selectedIndex, 'description', event.currentTarget.value)}
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
			<div
				class="flex flex-col gap-3 border-t border-base-300 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="flex items-center gap-3">
					<button class="btn btn-ghost btn-sm gap-2 rounded-full" onclick={resetToDefaults}>
						<RotateCcw size={14} />
						<span>Reset to defaults</span>
					</button>
					{#if submitError}
						<span class="flex items-center gap-1.5 text-xs font-medium text-error">
							<TriangleAlert size={13} />
							{submitError}
						</span>
					{:else if validationError}
						<span class="flex items-center gap-1.5 text-xs font-medium text-warning">
							<TriangleAlert size={13} />
							{validationError}
						</span>
					{/if}
				</div>
				<div class="flex items-center justify-end gap-2">
					<button class="btn btn-ghost btn-sm rounded-full" onclick={close}>Cancel</button>
					<button
						class="btn btn-primary btn-sm rounded-full"
						onclick={saveQuickLinks}
						disabled={isSubmitting || Boolean(validationError)}
					>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-xs"></span>
						{/if}
						<span>Save changes</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</dialog>
