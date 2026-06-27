<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api.js';
	import type { Id } from '../../convex/_generated/dataModel';
	import type { QuickLinkItem } from '$lib/components/power-bar/types';
	import { ArrowDown, ArrowUp, Link2, Plus, RotateCcw, Trash2, X } from 'lucide-svelte';

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

	let draftLinks = $state<QuickLinkItem[]>([]);
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
		hydratedCohortId = cohortId;
	});

	const validationError = $derived.by(() => {
		if (draftLinks.length > 12) return 'Quick links cannot exceed 12 items';

		for (const [index, link] of draftLinks.entries()) {
			const label = `Link ${index + 1}`;
			if (!link.title.trim()) return `${label} needs a title`;
			if (link.title.trim().length > 60) return `${label} title is too long`;
			if (link.description.trim().length > 120) return `${label} description is too long`;
			if (!link.href.trim()) return `${label} needs a destination`;
			if (!isValidHref(link.href)) {
				return `${label} destination must start with /, https://, or http://`;
			}
			if (!link.icon.trim()) return `${label} needs an icon`;
			if (link.icon.trim().length > 12) return `${label} icon is too long`;
		}

		return '';
	});

	function isValidHref(href: string) {
		const trimmed = href.trim();
		return (
			(trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
			trimmed.startsWith('https://') ||
			trimmed.startsWith('http://')
		);
	}

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
				icon: '🔗'
			}
		];
	}

	function removeLink(index: number) {
		draftLinks = draftLinks.filter((_, linkIndex) => linkIndex !== index);
	}

	function moveLink(index: number, direction: -1 | 1) {
		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= draftLinks.length) return;

		const nextLinks = [...draftLinks];
		const [moved] = nextLinks.splice(index, 1);
		nextLinks.splice(nextIndex, 0, moved);
		draftLinks = nextLinks;
	}

	function resetToDefaults() {
		if (!quickLinksQuery.data) return;
		draftLinks = quickLinksQuery.data.defaultLinks.map((link) => ({ ...link }));
		submitError = '';
	}

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
					icon: link.icon.trim()
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
	class="modal p-6"
	class:modal-open={isOpen}
	onclick={(event) => {
		if (event.target === event.currentTarget) close();
	}}
>
	<div class="modal-box w-full max-w-3xl rounded-2xl border border-base-300 p-0 shadow-2xl">
		<div class="flex items-start justify-between gap-4 border-b border-base-300 p-5">
			<div class="flex items-start gap-3">
				<div class="rounded-xl bg-primary/10 p-2 text-primary">
					<Link2 size={20} />
				</div>
				<div>
					<h3 class="text-xl font-bold">Edit Quick Links</h3>
					<p class="mt-1 text-sm text-base-content/60">
						These links appear for this cohort in the sidebar and command menu.
					</p>
				</div>
			</div>
			<button class="btn btn-ghost btn-sm btn-circle" onclick={close} aria-label="Close">
				<X size={18} />
			</button>
		</div>

		<div class="max-h-[min(72vh,42rem)] overflow-y-auto p-5">
			{#if quickLinksQuery.isLoading}
				<div class="flex items-center gap-3 py-8 text-base-content/70">
					<span class="loading loading-spinner loading-md"></span>
					<span>Loading quick links...</span>
				</div>
			{:else if quickLinksQuery.error}
				<div class="alert alert-error">
					<span>{quickLinksQuery.error.toString()}</span>
				</div>
			{:else}
				<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div class="text-sm text-base-content/60">
						{#if quickLinksQuery.data?.isCustomized}
							This cohort is using customized quick links.
						{:else}
							This cohort is using the default quick links.
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<button class="btn btn-outline btn-sm rounded-full gap-2" onclick={resetToDefaults}>
							<RotateCcw size={14} />
							<span>Reset Draft</span>
						</button>
						<button
							class="btn btn-outline btn-sm rounded-full gap-2"
							onclick={addLink}
							disabled={draftLinks.length >= 12}
						>
							<Plus size={14} />
							<span>Add Link</span>
						</button>
					</div>
				</div>

				{#if submitError}
					<div class="alert alert-error mb-4">
						<span>{submitError}</span>
					</div>
				{:else if validationError}
					<div class="alert alert-warning mb-4">
						<span>{validationError}</span>
					</div>
				{/if}

				{#if draftLinks.length === 0}
					<div class="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/60">
						No cohort quick links yet.
					</div>
				{:else}
					<div class="space-y-3">
						{#each draftLinks as link, index (index)}
							<div class="rounded-2xl border border-base-300 bg-base-100 p-4">
								<div class="mb-3 flex items-center justify-between gap-3">
									<div class="flex min-w-0 items-center gap-3">
										<span
											class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-200 text-base"
										>
											{link.icon || '🔗'}
										</span>
										<div class="min-w-0">
											<div class="truncate text-sm font-semibold">{link.title || 'Untitled link'}</div>
											<div class="truncate text-xs text-base-content/50">{link.href || 'No destination'}</div>
										</div>
									</div>
									<div class="flex shrink-0 items-center gap-1">
										<button
											class="btn btn-ghost btn-sm btn-circle"
											onclick={() => moveLink(index, -1)}
											disabled={index === 0}
											aria-label="Move link up"
										>
											<ArrowUp size={15} />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-circle"
											onclick={() => moveLink(index, 1)}
											disabled={index === draftLinks.length - 1}
											aria-label="Move link down"
										>
											<ArrowDown size={15} />
										</button>
										<button
											class="btn btn-ghost btn-sm btn-circle text-error"
											onclick={() => removeLink(index)}
											aria-label="Remove link"
										>
											<Trash2 size={15} />
										</button>
									</div>
								</div>

								<div class="grid grid-cols-1 gap-3 sm:grid-cols-[5rem_1fr_1fr]">
									<label class="form-control">
										<div class="label py-1">
											<span class="label-text text-xs">Icon</span>
										</div>
										<input
											class="input input-bordered input-sm"
											value={link.icon}
											maxlength="12"
											oninput={(event) =>
												updateLink(index, 'icon', event.currentTarget.value)}
										/>
									</label>
									<label class="form-control">
										<div class="label py-1">
											<span class="label-text text-xs">Title</span>
										</div>
										<input
											class="input input-bordered input-sm"
											value={link.title}
											maxlength="60"
											oninput={(event) =>
												updateLink(index, 'title', event.currentTarget.value)}
										/>
									</label>
									<label class="form-control">
										<div class="label py-1">
											<span class="label-text text-xs">Destination</span>
										</div>
										<input
											class="input input-bordered input-sm"
											value={link.href}
											maxlength="240"
											oninput={(event) =>
												updateLink(index, 'href', event.currentTarget.value)}
										/>
									</label>
								</div>
								<label class="form-control mt-3">
									<div class="label py-1">
										<span class="label-text text-xs">Description</span>
									</div>
									<input
										class="input input-bordered input-sm"
										value={link.description}
										maxlength="120"
										oninput={(event) =>
											updateLink(index, 'description', event.currentTarget.value)}
									/>
								</label>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<div class="flex items-center justify-end gap-2 border-t border-base-300 p-4">
			<button class="btn btn-ghost rounded-full" onclick={close}>Cancel</button>
			<button
				class="btn btn-primary rounded-full"
				onclick={saveQuickLinks}
				disabled={isSubmitting || Boolean(validationError) || quickLinksQuery.isLoading}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
				{/if}
				<span>Save Quick Links</span>
			</button>
		</div>
	</div>
</dialog>
