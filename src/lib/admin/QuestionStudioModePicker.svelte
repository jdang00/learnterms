<script lang="ts">
	import { ListChecks, MessageSquareText, Sparkles, Wand2 } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import type { GenerationMode } from './questionStudioTypes';

	interface Props {
		onSelectMode: (mode: GenerationMode) => void;
	}

	let { onSelectMode }: Props = $props();
</script>

<div class="card border border-base-300 bg-base-100 shadow-xs" in:fly={{ y: 14, duration: 260 }}>
	<div class="card-body gap-3 p-4 sm:p-5">
		<div class="flex items-center gap-2.5">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
			>
				<Sparkles size={16} />
			</span>
			<div class="min-w-0">
				<h2 class="text-sm font-semibold">How should the agent work?</h2>
				<p class="text-xs text-base-content/55">Pick how hands-on you want to be.</p>
			</div>
		</div>
		<div class="grid gap-2 sm:grid-cols-3">
			<button
				type="button"
				class="group flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
				onclick={() => onSelectMode('auto')}
			>
				<span
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-content"
				>
					<Wand2 size={17} />
				</span>
				<span class="text-sm font-semibold">Cover everything</span>
				<span class="text-xs leading-relaxed text-base-content/55">
					The agent drafts across every topic it found in your notes.
				</span>
			</button>
			<button
				type="button"
				class="group flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
				onclick={() => onSelectMode('guided')}
			>
				<span
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-content"
				>
					<MessageSquareText size={17} />
				</span>
				<span class="text-sm font-semibold">Guide the focus</span>
				<span class="text-xs leading-relaxed text-base-content/55">
					Add notes on what to emphasize, then generate.
				</span>
			</button>
			<button
				type="button"
				class="group flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
				onclick={() => onSelectMode('manual')}
			>
				<span
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-content"
				>
					<ListChecks size={17} />
				</span>
				<span class="text-sm font-semibold">Hand-pick</span>
				<span class="text-xs leading-relaxed text-base-content/55">
					Choose the exact topics and question mix yourself.
				</span>
			</button>
		</div>
	</div>
</div>
