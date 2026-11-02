<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Flag from '@lucide/svelte/icons/flag';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as ButtonGroup from '#lib/components/ui/button-group/index.js';
	import { TONES } from '#lib/components/ui/tone.js';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	const variants = ['solid', 'soft', 'outline', 'dash', 'ghost', 'link'] as const;
	let flagged = $state(true);
	let page = $state(0);
</script>

<Category
	id="actions"
	summary="solid for the primary action, soft for secondary, outline for a toggle, dash for a preference, ghost for a quiet utility."
>
	<Spec
		title="Button · variant × tone"
		src="#lib/components/ui/button"
		wide
		class="overflow-x-auto"
	>
		<table class="w-full border-separate border-spacing-y-2">
			<thead>
				<tr class="text-left font-mono text-xs text-muted-foreground">
					<th class="pe-4 font-medium">tone</th>
					{#each variants as v (v)}<th class="pe-3 font-medium">{v}</th>{/each}
				</tr>
			</thead>
			<tbody>
				{#each TONES as tone (tone)}
					<tr>
						<td class="pe-4 font-mono text-xs text-muted-foreground">{tone}</td>
						{#each variants as variant (variant)}
							<td class="pe-3">
								<Button {variant} {tone} size="sm">{tone === 'neutral' ? 'Clear' : 'Check'}</Button>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</Spec>

	<Spec title="Sizes and shapes" src="size · shape">
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-3">
				<Button size="xs">xs</Button>
				<Button size="sm">sm</Button>
				<Button>md</Button>
				<Button size="lg">lg</Button>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<Button shape="rect" variant="soft">rect</Button>
				<Button shape="circle" variant="ghost" tone="neutral" aria-label="Settings"
					><Settings /></Button
				>
				<Button shape="square" variant="outline" tone="neutral" aria-label="Add"><Plus /></Button>
				<div class="flex items-center">
					<Button variant="outline" tone="neutral" shape="segment-start" aria-label="Previous"
						><ArrowLeft /></Button
					>
					<Button variant="outline" tone="neutral" shape="segment-end" aria-label="Next"
						><ArrowRight /></Button
					>
				</div>
			</div>
		</div>
	</Spec>

	<Spec title="States and helpers" src="loading · disabled · aria-pressed · tooltip">
		<div class="flex flex-wrap items-center gap-3">
			<Button loading>Saving</Button>
			<Button disabled>Disabled</Button>
			<Button
				variant="outline"
				tone="warning"
				aria-pressed={flagged}
				onclick={() => (flagged = !flagged)}><Flag />{flagged ? 'Flagged' : 'Flag'}</Button
			>
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				tooltip="Settings"
				tooltipKbd="S"
				aria-label="Settings"><Settings /></Button
			>
			<Button
				variant="soft"
				tone="primary"
				tooltip="Draft questions from a PDF"
				tooltipSide="bottom"><Sparkles />Generate</Button
			>
			<ThemeToggle variant="outline" />
		</div>
	</Spec>

	<Spec
		title="Button group"
		src="#lib/components/ui/button-group"
		note="Joined pager, as in the admin progress drill-down."
	>
		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground tabular-nums">
				Questions {page * 10 + 1}–{page * 10 + 10} of 48
			</span>
			<ButtonGroup.Root>
				<Button
					variant="soft"
					tone="neutral"
					size="sm"
					shape="circle"
					aria-label="Previous questions"
					disabled={page === 0}
					onclick={() => (page = Math.max(0, page - 1))}><ChevronLeft size={18} /></Button
				>
				<Button
					variant="soft"
					tone="neutral"
					size="sm"
					shape="circle"
					aria-label="Next questions"
					disabled={page === 4}
					onclick={() => (page = Math.min(4, page + 1))}><ChevronRight size={18} /></Button
				>
			</ButtonGroup.Root>
		</div>
	</Spec>

	<Spec title="Badge" src="#lib/components/ui/badge">
		<div class="space-y-3">
			{#each ['solid', 'soft', 'outline', 'dash'] as const as variant (variant)}
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="w-14 font-mono text-xs text-muted-foreground">{variant}</span>
					{#each TONES as tone (tone)}<Badge {variant} {tone}>{tone}</Badge>{/each}
				</div>
			{/each}
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="w-14 font-mono text-xs text-muted-foreground">sizes</span>
				<Badge size="xs" tone="primary">xs</Badge>
				<Badge size="sm" tone="primary">sm</Badge>
				<Badge size="md" tone="primary">md</Badge>
				<Badge size="md" tone="warning"><Flag />Flagged</Badge>
				<Badge size="md" class="font-mono font-medium">Q 4 / 40</Badge>
			</div>
		</div>
	</Spec>
</Category>
