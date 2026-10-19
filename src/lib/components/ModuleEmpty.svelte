<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { cameFrom } from '$lib/utils/backNavigation';
	import { Button } from '$lib/components/ui/button';

	// The quiz with nothing in it: the navigator rail stays, holding open slots instead of questions.
	let {
		title,
		emoji = '📘',
		classId,
		moduleId,
		canEdit = false,
		unpublished = 0
	}: {
		title: string;
		emoji?: string;
		classId: string;
		moduleId: string;
		canEdit?: boolean;
		unpublished?: number;
	} = $props();

	const hasDrafts = $derived(canEdit && unpublished > 0);

	async function goToModuleSelection() {
		if (cameFrom('/classes')) history.back();
		else await goto(resolve('/classes'), { state: { classId } });
	}
</script>

<section
	class="h-full overflow-y-auto bg-background px-4 py-6 sm:px-8 sm:py-10"
	aria-labelledby="module-empty-title"
>
	<div class="rise mx-auto max-w-3xl">
		<Button
			variant="ghost"
			tone="neutral"
			size="sm"
			class="group -ms-3 gap-1 transition-all hover:gap-2"
			onclick={goToModuleSelection}
		>
			<ArrowLeft
				size={16}
				class="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
			/> Back to modules
		</Button>

		<div
			class="mt-4 flex h-20 items-center rounded-4xl border border-border px-5 sm:px-6"
			aria-hidden="true"
		>
			<div class="slots flex w-full items-center gap-4 overflow-hidden">
				{#each { length: 16 }, i (i)}
					<span
						class="slot size-10 shrink-0 rounded-full border border-dashed {i === 0
							? 'border-primary/50 bg-primary/8'
							: 'border-foreground/25'}"
						style:--i={i}
					></span>
				{/each}
			</div>
		</div>

		<div class="mt-8 px-1 sm:px-6">
			<div class="flex items-start gap-3">
				<span class="shrink-0 text-4xl leading-none">{emoji}</span>
				<div class="min-w-0">
					<h1 id="module-empty-title" class="font-display text-2xl font-semibold sm:text-3xl">
						No questions yet
					</h1>
					<p class="mt-0.5 truncate text-sm text-foreground/55">{title}</p>
				</div>
			</div>

			<p class="mt-4 max-w-xl text-pretty text-foreground/75">
				{#if hasDrafts}
					{unpublished}
					{unpublished === 1
						? "question in this module isn't published"
						: "questions in this module aren't published"}, so students see this screen.
				{:else}
					This module doesn't have any published questions. They'll show up here as soon as they're
					added.
				{/if}
			</p>

			{#if canEdit}
				<div class="mt-5">
					<Button
						href={resolve('/admin/[classId]/module/[moduleId]', { classId, moduleId })}
						size="sm"
						class="group gap-1 px-4 shadow-sm shadow-primary/25 transition-all hover:gap-2"
					>
						{hasDrafts ? 'Review questions' : 'Add questions'}
						<ArrowRight
							size={15}
							class="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
						/>
					</Button>
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.rise {
		animation: rise 0.4s cubic-bezier(0.33, 1, 0.68, 1) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	.slots {
		mask-image: linear-gradient(to right, black 30%, transparent 96%);
	}
	.slot {
		animation: slot-in 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
		animation-delay: calc(0.15s + var(--i) * 0.04s);
	}
	@keyframes slot-in {
		from {
			opacity: 0;
			transform: scale(0.4);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.rise,
		.slot {
			animation: none;
		}
	}
</style>
