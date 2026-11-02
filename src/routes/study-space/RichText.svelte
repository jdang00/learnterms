<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import { glossary, sourceTitle, type Citation, type Part } from './fixtures';

	// Answer and stem text: plain runs, numbered citations that preview the passage, and glossary
	// terms that explain themselves on hover.
	let { parts, citations = [] }: { parts: Part[]; citations?: Citation[] } = $props();
</script>

<span class="whitespace-pre-line"
	>{#each parts as part, i (i)}{#if typeof part === 'string'}{part}{:else if 'cite' in part}{@const c =
				citations.find((x) => x.n === part.cite)}<HoverCard.Root openDelay={80}
				><HoverCard.Trigger
					class="ms-0.5 inline-grid size-5 cursor-help place-items-center rounded-full bg-info/15 align-[1px] font-mono text-[10px] font-semibold text-info-ink"
					>{part.cite}</HoverCard.Trigger
				><HoverCard.Content class="w-72 space-y-1.5"
					>{#if c}<p class="text-xs font-semibold">
							{sourceTitle(c.sourceId)} · <span class="font-mono">p. {c.page}</span>
						</p>
						<p class="text-sm text-foreground/75">“{c.quote}”</p>{/if}</HoverCard.Content
				></HoverCard.Root
			>{:else}{@const entry = glossary[part.term]}<HoverCard.Root openDelay={120}
				><HoverCard.Trigger
					class="cursor-help underline decoration-primary/40 decoration-dotted underline-offset-4"
					>{part.term}</HoverCard.Trigger
				><HoverCard.Content class="w-72 space-y-2"
					><p class="font-semibold">{part.term}</p>
					<p class="text-sm text-foreground/75">{entry?.meaning}</p>
					{#if entry?.parts}<div class="flex flex-wrap gap-1.5">
							{#each entry.parts as piece (piece)}<Badge size="xs" tone="primary">{piece}</Badge
								>{/each}
						</div>{/if}</HoverCard.Content
				></HoverCard.Root
			>{/if}{/each}</span
>
