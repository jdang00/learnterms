<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { SelectField } from '#lib/components/ui/select/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import {
		FITB_MODE_LABELS,
		type FitbMode,
		type QuestionEditorState
	} from './questionEditor.svelte';

	let { form, onGenerate }: { form: QuestionEditorState; onGenerate: () => void } = $props();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between mb-2">
		<div class="label-caps">Accepted Answers</div>
		<Button
			variant="ghost"
			tone="neutral"
			size="xs"
			class="gap-1"
			onclick={onGenerate}
			tooltip="Create source-grounded questions in Question Studio"
		>
			{#if form.isGeneratingAI}
				<Spinner class="size-3" />
			{:else}
				<Sparkles size={12} />
			{/if}
			<span class="hidden sm:inline">Question Studio</span>
		</Button>
	</div>
	<Card.Root class="gap-0 py-0 shadow-xs">
		<Card.Content class="gap-4 p-4">
			{#each form.fitbAnswers as row, index (index)}
				<div class="flex flex-col sm:flex-row gap-3 items-start">
					<div class="flex-1 w-full">
						<div class="flex items-center gap-2 mb-1">
							<Badge
								variant={index === 0 ? 'solid' : 'soft'}
								tone={index === 0 ? 'success' : 'neutral'}
								size="sm"
							>
								{index === 0 ? 'Primary' : 'Alt'}
							</Badge>
							{#if form.fitbAnswers.length > 1}
								<Button
									variant="ghost"
									tone="error"
									size="xs"
									shape="circle"
									class="ml-auto sm:hidden"
									onclick={() => form.removeFitbRow(index)}
								>
									<X size={14} />
								</Button>
							{/if}
						</div>
						<Input
							type="text"
							class="h-8 px-3 text-sm font-medium"
							placeholder="Answer text"
							bind:value={row.value}
							oninput={() => form.touch()}
						/>
					</div>
					<div class="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-6">
						<SelectField
							size="sm"
							class="w-auto"
							value={row.mode}
							onValueChange={(v) => form.updateFitbMode(index, v as FitbMode)}
							options={Object.entries(FITB_MODE_LABELS).map(([mode, label]) => ({
								value: mode,
								label
							}))}
						/>
						<div class="flex items-center rounded-full border border-border p-0.5 gap-0.5">
							<Button
								size="sm"
								variant={row.flags.ignorePunct ? 'soft' : 'ghost'}
								tone="neutral"
								onclick={() => form.toggleFitbFlag(index, 'ignorePunct')}
								title="Ignore Punctuation"
							>
								Punct
							</Button>
							<Button
								size="sm"
								variant={row.flags.normalizeWs ? 'soft' : 'ghost'}
								tone="neutral"
								onclick={() => form.toggleFitbFlag(index, 'normalizeWs')}
								title="Normalize Whitespace"
							>
								Space
							</Button>
						</div>
						{#if form.fitbAnswers.length > 1}
							<Button
								variant="ghost"
								tone="error"
								size="sm"
								shape="circle"
								class="hidden sm:flex"
								onclick={() => form.removeFitbRow(index)}
							>
								<X size={16} />
							</Button>
						{/if}
					</div>
				</div>
				{#if index < form.fitbAnswers.length - 1}
					<Separator class="my-0" />
				{/if}
			{/each}
		</Card.Content>
		<div class="bg-muted/50 p-2 border-t border-border flex justify-center">
			<Button
				variant="ghost"
				tone="neutral"
				size="xs"
				class="gap-1"
				onclick={() => form.addFitbRow()}
			>
				<Plus size={14} /> Add Alternative
			</Button>
		</div>
	</Card.Root>
</div>
