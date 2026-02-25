<script lang="ts">
	import { PanelRight, Eye, Info, ChevronLeft, Settings } from 'lucide-svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import QuestionAttachmentsSidebar from '$lib/components/QuestionAttachmentsSidebar.svelte';

	let { qs = $bindable(), module, currentlySelected, userId, moduleId, client, classId } = $props();
	let hideSidebar = $state(false);
	let isInfoModalOpen = $state(false);
	let isSolutionModalOpen = $state(false);
	let isSettingsModalOpen = $state(false);

	async function handleReset() {
		if (userId && moduleId && client) {
			await qs.reset(userId, moduleId, client);
			qs.isResetModalOpen = false;
		}
	}

</script>

<div
	class="
	 hidden lg:flex lg:flex-col relative
	 overflow-y-auto overflow-x-hidden
	 border border-base-300
	 rounded-4xl
	 p-3 px-4
	 transition-all duration-200 ease-out
	 bg-base-100 backdrop-blur-md bg-opacity-80 shadow-lg
	 flex-shrink-0 h-full
	 {hideSidebar ? 'w-[72px]' : 'w-[min(22rem,30vw)] xl:w-[min(24rem,28vw)]'}

	"
>
	<button
		class="btn btn-ghost btn-square btn-sm rounded-full w-9 h-9 absolute top-6 left-5"
		onclick={() => (hideSidebar = !hideSidebar)}
		aria-label="Toggle sidebar"
	>
		<PanelRight
			size={18}
			class="transition-transform duration-300 {hideSidebar ? 'rotate-180' : ''}"
		/>
	</button>

	{#if !hideSidebar}
		<div class="p-4 md:p-5 lg:p-6 pt-12 mt-8">
			<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
				<a
					class="btn btn-ghost font-bold rounded-full"
					href={`/classes?classId=${classId}`}
				>
					<ChevronLeft size={16} /> MODULE {module.data.order + 1}
				</a>
			</h4>
			<h2 class="font-semibold text-2xl mt-2 flex items-start gap-3 min-w-0">
				<span class="text-2xl shrink-0">{module.data?.emoji || '📘'}</span>
				<span class="break-words hyphens-auto overflow-hidden">{module.data.title}</span>
			</h2>
			<p class="text-base-content/70 mt-2 break-words hyphens-auto">{module.data.description}</p>

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
			<QuestionAttachmentsSidebar
				questionId={currentlySelected?._id}
				showSolution={qs.showSolution}
				solutionOnlyBehavior="blur"
			/>

			{#if typeof currentlySelected.explanation === 'string' && (() => {
					const t = currentlySelected.explanation.trim().toLowerCase();
					return t.length > 0 && t !== 'undefined' && t !== 'null';
				})()}
				<div class="card bg-base-100 shadow-xl mt-6 rounded-2xl">
					<div class="card-body">
						<div class="flex flex-row flex-wrap justify-between border-b pb-2">
							<h2 class="card-title">Rationale</h2>
							<div class="flex flex-row">
								<kbd class="kbd kbd-sm hidden xl:block self-center me-1">tab</kbd>
								<button class="btn btn-ghost btn-circle" onclick={() => qs.handleSolution()}>
									<Eye />
								</button>
							</div>
						</div>
						<div
							class={`mt-2 break-words hyphens-auto transition-all duration-300 tiptap-content ${qs.showSolution ? 'blur-none' : 'blur-sm'}`}
						>
							{@html currentlySelected.explanation}
						</div>
					</div>
				</div>
			{/if}

			<div class="flex flex-row mt-6 justify-center">
				<button class="btn btn-soft btn-sm rounded-full" onclick={() => (isSettingsModalOpen = true)}>
					<Settings size={16} />
					<span class="ml-1 hidden sm:inline">Settings</span>
				</button>
			</div>
		</div>
	{:else}
		<div class="mt-16 justify-self-center flex flex-col items-center space-y-4 ms-1">
			<div class="flex flex-col items-center space-y-4">
				<a
					class="group flex items-center justify-center font-bold text-secondary-content bg-secondary text-center w-full rounded-full transition-colors"
					href={`/classes?classId=${classId}`}
				>
					<span class="group-hover:hidden">{module.data.order + 1}</span>
					<span class="hidden group-hover:inline-flex items-center justify-center"
						><ChevronLeft size={24} /></span
					>
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

				<QuestionAttachmentsSidebar
					questionId={currentlySelected?._id}
					showSolution={qs.showSolution}
					solutionOnlyBehavior="blur"
					collapsed={true}
				/>
			</div>

			<div class="border-t border-base-300 w-full my-2"></div>

			<button
				class="btn btn-circle btn-lg mt-3 btn-soft"
				onclick={() => (isSettingsModalOpen = true)}
				title="Settings"
			>
				<Settings />
			</button>
		</div>
	{/if}

</div>

 

<dialog class="modal max-w-full p-4" class:modal-open={isInfoModalOpen}>
	<div class="modal-box rounded-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isInfoModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="font-bold">Module Information</h3>
		<p class="py-4"></p>
		<p class="font-2xl font-semibold">Module {module.data.order + 1}: {module.data.title}</p>
		<p class="text-base-content/70">{module.data.description}</p>
		<div class="modal-action">
			<button class="btn rounded-full" onclick={() => (isInfoModalOpen = false)}>Close</button>
		</div>
	</div>
</dialog>

<dialog class="modal max-w-full p-4" class:modal-open={isSolutionModalOpen}>
	<div class="modal-box rounded-2xl">
		<form method="dialog">
			<button
				class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
				onclick={() => (isSolutionModalOpen = false)}>✕</button
			>
		</form>
		<h3 class="text-lg font-bold">Rationale</h3>
		{#if typeof currentlySelected.explanation === 'string' && currentlySelected.explanation.trim().length > 0}
			<div class="py-4 tiptap-content">{@html currentlySelected.explanation}</div>
		{/if}
	</div>
</dialog>

<SettingsModal bind:qs bind:isOpen={isSettingsModalOpen} />

<dialog class="modal max-w-full p-4 z-[1000]" class:modal-open={qs.isResetModalOpen}>
	<div class="modal-box rounded-2xl">
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
			<button class="btn btn-outline rounded-full" onclick={() => (qs.isResetModalOpen = false)}>
				Cancel
			</button>
			<button class="btn btn-error rounded-full" onclick={() => handleReset()}>Reset</button>
		</div>
	</div>
</dialog>
