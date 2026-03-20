<script lang="ts">
	import { ChevronLeft, RotateCcw, Play } from 'lucide-svelte';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';

    type QsControls = {
		isResetModalOpen: boolean;
		autoNextEnabled: boolean;
		optionsShuffleEnabled: boolean;
		setAutoNextEnabled: (enabled: boolean) => void;
		setOptionsShuffleEnabled: (enabled: boolean) => void;
        fullscreenEnabled: boolean;
	};

	let {
		module,
		classId,
		progressPercentage,
		suppressAuthErrors = false,
		qs
	}: {
		module: { data?: Doc<'module'> | null; isLoading: boolean; error: any };
		classId: Id<'class'>;
		progressPercentage: number;
		suppressAuthErrors?: boolean;
		qs?: QsControls;
	} = $props();

	function isAuthError(error: any): boolean {
		if (!error) return false;
		const message = error.message || error.toString();
		const patterns = ['unauthorized', 'authentication', 'not authenticated', 'session expired', 'token expired', 'invalid token', 'jwt', 'access denied', 'forbidden'];
		return patterns.some(pattern => message.toLowerCase().includes(pattern));
	}

	let shouldShowError = $derived(module.error && !(suppressAuthErrors && isAuthError(module.error)));
</script>

{#if module.isLoading}
	<p>Loading...</p>
{:else if shouldShowError}
	<ErrorBoundary
		error={module.error}
		title="Module Loading Error"
		message="Unable to load module information."
		suppressIfOtherAuthErrors={suppressAuthErrors}
		class="mb-4"
	/>
{:else}
	<div class="mx-auto max-w-5xl mt-8 sm:mt-12 px-2 sm:px-0">
		<div class="p-4 md:p-5 lg:p-6 pt-8 sm:pt-12 pl-8 sm:pl-12 mt-4 sm:mt-8">
			{#if qs}
                <div class="mb-4 p-3 rounded-lg flex flex-wrap items-center gap-3 justify-between">
					<div class="flex flex-wrap items-center gap-2">
                        <button class="btn btn-primary btn-soft" onclick={() => (qs.fullscreenEnabled = true)}>
                            <Play size={14} />
                            <span class="ml-1 hidden sm:inline">Start</span>
                        </button>
						<button class="btn btn-error btn-soft" onclick={() => (qs.isResetModalOpen = true)}>
							<RotateCcw size={14} />
							<span class="ml-1 hidden sm:inline">Reset</span>
						</button>
					</div>
					<div class="flex flex-wrap items-center gap-4">
						<label class="label cursor-pointer gap-2">
							<span class="text-sm">Auto next</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								checked={qs.autoNextEnabled}
								onchange={(e) => qs.setAutoNextEnabled((e.currentTarget as HTMLInputElement).checked)}
								aria-label="Auto next"
							/>
						</label>
						<label class="label cursor-pointer gap-2">
							<span class="text-sm">Shuffle options</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								checked={qs.optionsShuffleEnabled}
								onchange={(e) => qs.setOptionsShuffleEnabled((e.currentTarget as HTMLInputElement).checked)}
								aria-label="Shuffle options"
							/>
						</label>
					</div>
				</div>
			{/if}
			<h4 class="font-bold text-sm tracking-wide text-secondary -ms-6">
				<a class="btn btn-ghost font-bold" href={`/classes?classId=${classId}`}>
					<ChevronLeft size={16} /> Back to Module {(module.data?.order ?? 0) + 1}
				</a>
			</h4>
			<h2 class="font-semibold text-2xl sm:text-3xl mt-2 flex items-center gap-2 sm:gap-3">
				<span class="text-2xl sm:text-3xl">{module.data?.emoji || '📘'}</span>
				<span class="leading-tight">{module.data?.title || ''}</span>
			</h2>
			<p class="text-base-content/70 mt-2 text-sm sm:text-base">{module.data?.description || ''}</p>

			<div class="mt-6">
				<p class="text-base-content/60 mb-2">{progressPercentage}% done.</p>
				<progress
					class="progress progress-success w-full transition-colors"
					value={progressPercentage}
					max="100"
				></progress>
			</div>
		</div>
	</div>
{/if}
