<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import type { Id } from '../../../convex/_generated/dataModel';
	import Info from '@lucide/svelte/icons/info';
	import Plus from '@lucide/svelte/icons/plus';
	import TagsIcon from '@lucide/svelte/icons/tags';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import { LoadingState } from '$lib/components/ui/spinner';
	import { Tip } from '$lib/components/ui/tooltip';
	import TagEditorDialog, { type TagSummary, type TaggableModule } from './TagEditorDialog.svelte';

	let { classId, modules = [] }: { classId: Id<'class'>; modules?: TaggableModule[] } = $props();

	const tagsQuery = useQuery(api.tags.getTagsForClass, () => ({ classId }));
	const tags = $derived(tagsQuery.data ?? []);

	const modulesByTag = $derived.by(() => {
		const byTag: Record<string, TaggableModule[]> = {};
		for (const module of modules) {
			for (const tag of module.tags ?? []) (byTag[tag._id] ??= []).push(module);
		}
		return byTag;
	});

	let editorOpen = $state(false);
	let editing = $state<TagSummary | null>(null);

	function openEditor(tag: TagSummary | null) {
		editing = tag;
		editorOpen = true;
	}
</script>

<section class="surface p-4 sm:p-5">
	<div class="flex items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<h3 class="text-base font-semibold">Tags</h3>
				{#if tags.length}<Badge variant="soft" tone="neutral">{tags.length}</Badge>{/if}
				<Tip
					label="Tags group modules, like “Midterm” or “Quiz 4”. Students pick a tag when building a practice test to select all of its modules."
					side="right"
				>
					<span class="flex size-6 items-center justify-center rounded-full text-foreground/50">
						<Info size={14} />
					</span>
				</Tip>
			</div>
			{#if tags.length}
				<p class="text-sm text-foreground/60">Click a tag to edit it.</p>
			{/if}
		</div>
		{#if tags.length}
			<Button size="sm" variant="soft" onclick={() => openEditor(null)}>
				<Plus size={14} /> New tag
			</Button>
		{/if}
	</div>

	<div class="mt-4">
		{#if tagsQuery.isLoading}
			<LoadingState inline label="Loading tags…" class="py-4" />
		{:else if tagsQuery.error}
			<Alert.Root tone="error" class="py-2 text-sm">
				<Alert.Title>Failed to load tags.</Alert.Title>
			</Alert.Root>
		{:else if !tags.length}
			<Empty.Root class="surface-dashed gap-3 p-6">
				<Empty.Media class="mb-0 text-foreground/35"><TagsIcon size={22} /></Empty.Media>
				<Empty.Description>No tags yet.</Empty.Description>
				<Button size="sm" variant="soft" onclick={() => openEditor(null)}>
					<Plus size={14} /> New tag
				</Button>
			</Empty.Root>
		{:else}
			<ul class="flex flex-wrap gap-2">
				{#each tags as tag (tag._id)}
					{@const count = modulesByTag[tag._id]?.length ?? 0}
					<li>
						<button
							type="button"
							class="inline-flex items-center gap-2 rounded-full border border-border bg-background py-1.5 ps-3 pe-2 text-sm font-medium transition-colors hover:border-foreground/25 hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
							aria-label="Edit {tag.name}, {count === 1 ? '1 module' : `${count} modules`}"
							onclick={() => openEditor(tag)}
						>
							<span
								class="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/10"
								style:background-color={tag.color || '#64748b'}
							></span>
							{tag.name}
							<span
								class="min-w-5 rounded-full bg-foreground/6 px-1.5 text-center text-xs tabular-nums text-foreground/60"
								>{count}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<TagEditorDialog
	bind:open={editorOpen}
	{classId}
	tag={editing}
	{modules}
	usedColors={tags.map((tag) => (tag.color ?? '').toLowerCase())}
/>
