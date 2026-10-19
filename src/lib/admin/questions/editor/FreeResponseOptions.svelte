<script lang="ts">
	import AcceptanceMeter from '$lib/components/AcceptanceMeter.svelte';
	import { acceptanceLevels, type AcceptanceLevel } from '$lib/utils/freeResponse';
	import type { QuestionEditorState } from './questionEditor.svelte';

	let { form }: { form: QuestionEditorState } = $props();
</script>

<div class="space-y-4">
	<div id="acceptance-label" class="label-caps">Acceptance</div>
	<div
		role="radiogroup"
		aria-labelledby="acceptance-label"
		class="grid grid-cols-1 gap-3 sm:grid-cols-3"
	>
		{#each Object.entries(acceptanceLevels) as [value, level] (value)}
			{@const selected = form.freeResponseAcceptance === value}
			<label
				class="flex cursor-pointer flex-col gap-1.5 rounded-3xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/20 {selected
					? 'border-primary bg-primary/5'
					: 'border-border bg-background hover:border-foreground/20'}"
			>
				<input
					type="radio"
					class="sr-only"
					name="free-response-acceptance"
					{value}
					checked={selected}
					onchange={() => {
						form.freeResponseAcceptance = value as AcceptanceLevel;
						form.touch();
					}}
				/>
				<span class="flex items-center gap-2 text-sm font-semibold">
					<AcceptanceMeter
						level={value as AcceptanceLevel}
						class={selected ? 'text-primary-ink' : 'text-foreground/50'}
					/>
					{level.label}
					{#if value === 'lenient'}
						<span class="ml-auto text-[10px] font-medium text-foreground/40">Default</span>
					{/if}
				</span>
				<span class="text-xs leading-snug text-foreground/60">{level.description}</span>
			</label>
		{/each}
	</div>
</div>
