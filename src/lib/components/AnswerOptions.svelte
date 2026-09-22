<script lang="ts">
	import { Eye } from 'lucide-svelte';
	let { qs = $bindable(), currentlySelected, compact = false, allowElimination = true } = $props();

	function handleOptionChange(optionId: string) {
		qs.toggleOption(optionId);
		qs.scheduleSave?.();
	}

	function handleEliminateOption(optionId: string) {
		qs.toggleElimination(optionId);
		qs.scheduleSave?.();
	}

	// Swipe an option left on a touch screen to cross it out (or bring it back).
	const SWIPE_COMMIT = 72;
	let swipe = $state<{ id: string; dx: number } | null>(null);
	let gesture: { id: string; pointerId: number; x: number; y: number; axis?: 'x' | 'y' } | null =
		null;
	let suppressClick = false;

	function swipeDown(event: PointerEvent, optionId: string) {
		if (event.pointerType !== 'touch' || !allowElimination || qs.showSolution) return;
		gesture = { id: optionId, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
	}

	function swipeMove(event: PointerEvent) {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		const dx = event.clientX - gesture.x;
		const dy = event.clientY - gesture.y;
		if (!gesture.axis) {
			if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) gesture.axis = 'x';
			else if (Math.abs(dy) > 10) gesture.axis = 'y';
		}
		if (gesture.axis === 'x') swipe = { id: gesture.id, dx: Math.max(-120, Math.min(0, dx)) };
	}

	function swipeEnd(event: PointerEvent) {
		if (!gesture || event.pointerId !== gesture.pointerId) return;
		if (gesture.axis === 'x') {
			suppressClick = true;
			if ((swipe?.dx ?? 0) <= -SWIPE_COMMIT) {
				handleEliminateOption(gesture.id);
				navigator.vibrate?.(8);
			}
		}
		gesture = null;
		swipe = null;
	}

	function swallowSwipeClick(event: MouseEvent) {
		if (!suppressClick) return;
		suppressClick = false;
		event.preventDefault();
		event.stopPropagation();
	}
</script>

<div
	class="flex flex-col justify-start {compact
		? 'space-y-3'
		: 'space-y-2 md:space-y-3 lg:space-y-4'}"
>
	{#each qs.getOrderedOptions(currentlySelected) as option, i (option.id)}
		{@const offset = swipe && swipe.id === option.id ? swipe.dx : 0}
		<div class="relative" data-option>
			{#if offset}
				<div
					class="absolute inset-0 flex items-center justify-end rounded-2xl bg-base-300 pe-5 text-sm font-medium sm:rounded-full {offset <=
					-SWIPE_COMMIT
						? 'text-base-content'
						: 'text-base-content/50'}"
					aria-hidden="true"
				>
					{qs.isOptionEliminated(option.id) ? 'Restore' : 'Cross out'}
				</div>
			{/if}
			<label
				class="label relative w-full touch-pan-y cursor-pointer rounded-2xl sm:rounded-full flex items-center border-base-300 bg-base-200 transition-[color,background-color,border-color,translate] duration-200
            {compact ? 'border p-1.5 md:p-2' : 'border-2 p-2 md:p-3'}
            {qs.showSolution
					? qs.isCorrect(option.id)
						? qs.solutionAutoRevealed
							? 'flash-green'
							: 'border-success'
						: qs.solutionAutoRevealed
							? ''
							: 'border-error'
					: ''}"
				style:translate={offset ? `${offset}px 0` : undefined}
				style:transition={offset ? 'none' : undefined}
				onpointerdown={(event) => swipeDown(event, option.id)}
				onpointermove={swipeMove}
				onpointerup={swipeEnd}
				onpointercancel={swipeEnd}
				onclickcapture={swallowSwipeClick}
			>
				<input
					type="checkbox"
					class="checkbox checkbox-primary {compact ? 'checkbox-xs' : 'checkbox-sm'} {compact
						? 'ms-2 md:ms-3'
						: 'ms-4'}"
					value={option.id}
					checked={qs.isOptionSelected(option.id)}
					onchange={() => {
						handleOptionChange(option.id);
					}}
					disabled={qs.isOptionEliminated(option.id) || qs.showSolution}
				/>
				<span
					class="grow text-wrap break-words {compact
						? 'ml-2 md:ml-3 my-2 md:my-3 text-xs md:text-sm'
						: 'ml-3 md:ml-4 my-3 text-base'}"
				>
					<span class="font-semibold mr-2 select-none">{String.fromCharCode(65 + i)}.</span>
					<span
						class="{qs.isOptionEliminated(option.id)
							? 'line-through opacity-50'
							: ''} tiptap-content">{@html option.text}</span
					>
				</span>

				{#if allowElimination}
					<div
						class="flex items-center justify-center {compact
							? 'w-10 md:w-12 mr-1 md:mr-2'
							: 'w-12 md:w-16 mr-2 md:mr-4'}"
					>
						<button
							class="btn btn-ghost btn-circle {compact ? 'btn-sm' : 'btn-md'}"
							onclick={() => handleEliminateOption(option.id)}
							disabled={qs.showSolution}
							aria-label="eliminate option {option.id}"
						>
							<Eye />
						</button>
					</div>
				{/if}
			</label>
		</div>
	{/each}
</div>

<style>
	@keyframes flash-success {
		0% {
			border-color: var(--color-base-300);
		}
		15% {
			border-color: var(--color-success);
		}
		85% {
			border-color: var(--color-success);
		}
		100% {
			border-color: var(--color-base-300);
		}
	}
	.flash-green {
		animation: flash-success 1.2s ease-in-out forwards;
	}
</style>
