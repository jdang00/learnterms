<script lang="ts">
	import { toast } from 'svelte-sonner';
	import FileText from '@lucide/svelte/icons/file-text';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Plus from '@lucide/svelte/icons/plus';
	import Presentation from '@lucide/svelte/icons/presentation';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Marker from '#lib/components/ui/marker/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { sources, type Source } from './fixtures';

	let { selected = $bindable(), onOpen }: { selected: string[]; onOpen: (source: Source) => void } =
		$props();

	const ready = sources.filter((s) => !s.processing);
	const allSelected = $derived(ready.every((s) => selected.includes(s.id)));
	const icon = { pdf: FileText, slides: Presentation, notes: NotebookPen } as const;

	function toggle(id: string, on: boolean) {
		selected = on ? [...selected, id] : selected.filter((s) => s !== id);
	}
</script>

<section class="flex h-full min-h-0 flex-col" aria-label="Sources">
	<header class="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
		<h2 class="label-caps">Sources · {sources.length}</h2>
		<Button
			size="xs"
			variant="soft"
			tone="neutral"
			onclick={() => toast('Uploading is not part of the mock')}><Plus />Add</Button
		>
	</header>

	<label class="mx-4 mb-2 flex items-center gap-2.5 text-sm text-muted-foreground">
		<Checkbox
			checked={allSelected}
			indeterminate={selected.length > 0 && !allSelected}
			onCheckedChange={(on) => (selected = on ? ready.map((s) => s.id) : [])}
		/>
		Use all sources in chat
	</label>

	<ScrollArea class="min-h-0 flex-1">
		<ul class="space-y-2 px-3 pb-3">
			{#each sources as source (source.id)}
				{@const Icon = icon[source.kind]}
				<li class="flex items-center gap-2">
					<Checkbox
						checked={selected.includes(source.id)}
						disabled={source.processing}
						onCheckedChange={(on) => toggle(source.id, on)}
						aria-label="Use {source.title} in chat"
						class="ms-1"
					/>
					<Attachment.Root
						state={source.processing ? 'processing' : 'done'}
						size="sm"
						class="min-w-0 flex-1"
					>
						{#if !source.processing}
							<Attachment.Trigger aria-label="Open {source.title}" onclick={() => onOpen(source)} />
						{/if}
						<Attachment.Media>
							{#if source.processing}<Spinner />{:else}<Icon />{/if}
						</Attachment.Media>
						<Attachment.Content class="min-w-0 flex-1">
							<Attachment.Title>{source.title}</Attachment.Title>
							<Attachment.Description>
								{source.processing
									? `Reading ${source.pages} pages…`
									: `${source.pages} pages · ${source.added}`}
							</Attachment.Description>
						</Attachment.Content>
					</Attachment.Root>
				</li>
			{/each}
		</ul>
	</ScrollArea>

	<footer class="border-t border-border px-4 py-3">
		<Marker.Root role="status" class="text-xs text-muted-foreground">
			<Marker.Content>Answers use {selected.length} of {sources.length} sources</Marker.Content>
		</Marker.Root>
	</footer>
</section>
