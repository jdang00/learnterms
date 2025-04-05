<script>
	let { qm = $bindable(), admin } = $props();
	import { Eye, Lightbulb, ArrowLeft } from 'lucide-svelte';
</script>

<div
	class="
    hidden lg:block w-1/4
    overflow-y-auto
    h-screen
    sticky top-0
    bg-base-100
    border border-base-300
    rounded-xl
    shadow-lg
    p-6
  "
>
	<div class="flex flex-row justify-between mb-4">
		<a class="btn btn-ghost" href="/dashboard"> <ArrowLeft />Back</a>
	</div>

	<div>
		<p class="font-bold text-sm tracking-wide text-secondary mb-2">
			CHAPTER {qm.chapterData.chapter}
		</p>
		<h1 class="text-3xl font-bold">{qm.chapterData.name}</h1>
		<p class="text-base-content mt-2">{qm.chapterData.desc}</p>

		<p class="text-base-content/80 mt-4">{qm.progress}% done.</p>
		<p>
			<progress
				class="progress progress-success w-full transition-colors"
				value={qm.progress}
				max="100"
			></progress>
		</p>

		<div class="flex flex-col justify-center">
			<div class="card bg-base-100 shadow-xl mt-12">
				<div class="card-body">
					<div class="flex flex-row flex-wrap justify-between border-b pb-2">
						<h2 class="card-title">Solution</h2>
						<div class="flex flex-row">
							<kbd class="kbd kbd-sm hidden xl:block self-center me-1">tab</kbd>
							<button class="btn btn-ghost" onclick={() => qm.handleSolution()}>
								<Eye />
							</button>
						</div>
					</div>
					<p
						class={`mt-2 transition-all duration-300 ${qm.showSolution ? 'blur-none' : 'blur-sm'}`}
					>
						{qm.questionSolution}
					</p>
				</div>
			</div>

			<div class="flex flex-row mt-12 justify-center space-x-2">
				<button class="btn btn-error btn-soft" onclick={() => (qm.isResetModalOpen = true)}>
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
				{#if admin}
					<a class="btn btn-info btn-soft" href="/admin" target="_blank"> Admin </a>
				{/if}
			</div>
		</div>
	</div>
</div>

<div>
	<dialog class="modal max-w-full p-4" class:modal-open={qm.isResetModalOpen}>
		<div class="modal-box">
			<form method="dialog">
				<button
					class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					onclick={() => (qm.isResetModalOpen = false)}
				>
					✕
				</button>
			</form>
			<h3 class="text-lg font-bold">Reset Progress</h3>
			<p class="py-4">
				Do you want to start over? All current progress for this chapter will be lost.
			</p>
			<div class="flex justify-end space-x-2">
				<button class="btn btn-outline" onclick={() => (qm.isResetModalOpen = false)}>
					Cancel
				</button>
				<button class="btn btn-error" onclick={() => qm.reset()}>Reset</button>
			</div>
		</div>
	</dialog>
</div>
