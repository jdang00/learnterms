<script lang="ts">
	import { PanelRight, Eye, Info, RotateCcw, ChevronLeft, Lightbulb } from 'lucide-svelte';

	let { qs = $bindable(), module, currentlySelected, userId, moduleId, client, classId } = $props();
	let hideSidebar = $state(false);
	let isInfoModalOpen = $state(false);
	let isSolutionModalOpen = $state(false);

	async function handleReset() {
		if (userId && moduleId && client) {
			await qs.reset(userId, moduleId, client);
			qs.isResetModalOpen = false;
		}
	}
</script>

<div
	class="
 hidden lg:block
 overflow-y-auto
 h-full
 border border-base-300
 rounded-xl
 p-3
 transition-all duration-200 ease-out
 {hideSidebar ? 'w-1/20' : 'w-1/4'}
 bg-base-100 backdrop-blur-md bg-opacity-80 shadow-lg
 "
>
	<button
		class="btn btn-ghost btn-md justify-self-center ms-1"
		onclick={() => (hideSidebar = !hideSidebar)}
	>
		<PanelRight
			size={18}
			class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
		/>
	</button>

	{#if !hideSidebar}
		<div class="p-6">
			<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
				<a class="btn btn-ghost font-bold" href={`/classes?classId=${classId}`}>
					<ChevronLeft size={16} /> CHAPTER {module.data.order}
				</a>
			</h4>
			<h2 class="font-semibold text-3xl mt-2">{module.data.title}</h2>
			<p class="text-base-content/70 mt-2">{module.data.description}</p>

			<div class="mt-6">
				<p class="text-base-content/60 mb-2">{qs.getProgressPercentage()}% done.</p>
				<progress
					class="progress progress-success w-full transition-colors"
					value={qs.getProgressPercentage()}
					max="100"
				></progress>
			</div>
		</div>

		<div class="flex flex-col justify-center m-4">
			<div class="card bg-base-100 shadow-xl mt-12">
				<div class="card-body">
					<div class="flex flex-row flex-wrap justify-between border-b pb-2">
						<h2 class="card-title">Solution</h2>
						<div class="flex flex-row">
							<kbd class="kbd kbd-sm hidden xl:block self-center me-1">tab</kbd>
							<button class="btn btn-ghost btn-circle" onclick={() => qs.handleSolution()}>
								<Eye />
							</button>
						</div>
					</div>
					<p
						class={`mt-2 transition-all duration-300 ${qs.showSolution ? 'blur-none' : 'blur-sm'}`}
					>
						{currentlySelected.explanation}
					</p>
				</div>
			</div>

			<div class="flex flex-row mt-6 justify-center space-x-2">
				<button class="btn btn-error btn-soft" onclick={() => (qs.isResetModalOpen = true)}>
					Reset
				</button>

				<div class="tooltip" data-tip="Shortcuts">
					<button class="btn btn-ghost">
						<Lightbulb />
					</button>
					<div class="tooltip-content bg-base-200 text-base-content rounded p-2 shadow-md">
						<div class="font-mono flex flex-col gap-1">
							<div class="flex items-center gap-4 justify-between">
								<kbd class="kbd kbd-sm">shift + s</kbd>
								<span>Shuffle</span>
							</div>
							<div class="flex items-center gap-4 justify-between">
								<kbd class="kbd kbd-sm">f</kbd>
								<span>Flag</span>
							</div>
							<div class="flex items-center gap-4 justify-between">
								<kbd class="kbd kbd-sm">enter</kbd>
								<span>Check</span>
							</div>
							<div class="flex items-center gap-4 justify-between">
								<kbd class="kbd kbd-sm">arrows</kbd>
								<span>Navigation</span>
							</div>
							<div class="flex items-center gap-4 justify-between">
								<kbd class="kbd kbd-sm">esc</kbd>
								<span>Clear</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="mt-4 justify-self-center flex flex-col items-center space-y-4 ms-1">
			<div class="flex flex-col items-center space-y-4">
				<a
					class="font-bold text-secondary-content bg-secondary text-center w-full rounded-full"
					href={`/classes?classId=${classId}`}
				>
					{module.data.order}
				</a>

				<button
					class="btn btn-circle btn-lg btn-soft btn-primary"
					onclick={() => (isInfoModalOpen = true)}><Info /></button
				>

				<div
					class="radial-progress text-success text-xs bg-base-300"
					style="--value:{qs.getProgressPercentage()}; --size:3rem; --thickness: 3px;"
					aria-valuenow="70"
					role="progressbar"
				>
					{qs.getProgressPercentage()}%
				</div>
				<button class="btn btn-circle btn-lg btn-soft" onclick={() => (isSolutionModalOpen = true)}
					><Eye /></button
				>
			</div>

			<div class="border-t border-base-300 w-full my-2"></div>

			<button
				class="btn btn-circle btn-lg btn-soft btn-error"
				onclick={() => (qs.isResetModalOpen = true)}
				title="Reset Progress"
			>
				<RotateCcw />
			</button>
		</div>
	{/if}
</div>

<dialog class="modal max-w-full p-4" class:modal-open={isInfoModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isInfoModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="font-bold">Chapter Information</h3>
		<p class="py-4"></p>
		<p class="font-2xl font-semibold">Chapter {module.data.order}: {module.data.title}</p>
		<p class="text-base-content/70">{module.data.description}</p>
		<div class="modal-action">
			<button class="btn" onclick={() => (isInfoModalOpen = false)}>Close</button>
		</div>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isSolutionModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isSolutionModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="text-lg font-bold">Solution</h3>
		<p class="py-4">{currentlySelected.explanation}</p>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={qs.isResetModalOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (qs.isResetModalOpen = false)}
			>
				✕
			</button>
		</form>
		<h3 class="text-lg font-bold">Reset Progress</h3>
		<p class="py-4">
			Do you want to start over? All current progress for this module will be lost.
		</p>
		<div class="flex justify-end space-x-2">
			<button class="btn btn-outline" onclick={() => (qs.isResetModalOpen = false)}>
				Cancel
			</button>
			<button class="btn btn-error" onclick={() => handleReset()}>Reset</button>
		</div>
	</div>
</dialog>
