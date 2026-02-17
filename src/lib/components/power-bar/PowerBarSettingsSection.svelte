<script lang="ts">
	import { Moon, Sun, ArrowRight, Settings2 } from 'lucide-svelte';

	interface Props {
		searchQuery?: string;
		isDarkMode?: boolean;
		autoNextEnabled?: boolean;
		optionsShuffleEnabled?: boolean;
		onSetTheme?: (themeName: 'light' | 'dark') => void;
		onSetAutoNext?: (enabled: boolean) => void;
		onSetShuffleAnswers?: (enabled: boolean) => void;
	}

	let {
		searchQuery = '',
		isDarkMode = false,
		autoNextEnabled = true,
		optionsShuffleEnabled = false,
		onSetTheme,
		onSetAutoNext,
		onSetShuffleAnswers
	}: Props = $props();

	function matchesQuery(query: string, terms: string[]): boolean {
		if (!query) return true;
		return terms.some((term) => term.includes(query));
	}

	const showTheme = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		return matchesQuery(query, ['theme', 'light', 'dark', 'mode', 'appearance']);
	});

	const showAutoNext = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		return matchesQuery(query, ['auto', 'next', 'automatic', 'advance', 'autonext']);
	});

	const showShuffle = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		return matchesQuery(query, ['shuffle', 'answers', 'answer', 'options', 'random']);
	});
</script>

<section class="space-y-2">
	<div class="px-3 pt-1">
		<p class="text-[11px] font-medium uppercase tracking-wider text-base-content/35">Settings</p>
	</div>

	{#if showTheme || showAutoNext || showShuffle}
		<div class="rounded-2xl border border-base-300 p-3">
			{#if showTheme}
				<div class="flex items-center justify-between gap-3">
					<div class="min-w-0">
						<p class="text-[13px] font-semibold">Theme</p>
						<p class="text-[11px] text-base-content/50">Switch between light and dark mode</p>
					</div>
					<div class="join">
						<button
							type="button"
							class="btn btn-xs join-item rounded-full"
							class:btn-primary={!isDarkMode}
							class:btn-ghost={isDarkMode}
							onclick={() => onSetTheme?.('light')}
							data-power-item="true"
						>
							<Sun size={13} />
							Light
						</button>
						<button
							type="button"
							class="btn btn-xs join-item rounded-full"
							class:btn-primary={isDarkMode}
							class:btn-ghost={!isDarkMode}
							onclick={() => onSetTheme?.('dark')}
							data-power-item="true"
						>
							<Moon size={13} />
							Dark
						</button>
					</div>
				</div>
			{/if}

			{#if showAutoNext}
				<div class="mt-3 border-t border-base-300 pt-3">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="text-[13px] font-semibold">Auto Next</p>
							<p class="text-[11px] text-base-content/50">Advance after correct answer</p>
						</div>
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm"
							checked={autoNextEnabled}
							onchange={(event) =>
								onSetAutoNext?.((event.currentTarget as HTMLInputElement).checked)}
							aria-label="Toggle auto next"
							data-power-item="true"
						/>
					</div>
				</div>
			{/if}

			{#if showShuffle}
				<div class="mt-3 border-t border-base-300 pt-3">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="text-[13px] font-semibold">Shuffle Answers</p>
							<p class="text-[11px] text-base-content/50">Randomize answer option order</p>
						</div>
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm"
							checked={optionsShuffleEnabled}
							onchange={(event) =>
								onSetShuffleAnswers?.((event.currentTarget as HTMLInputElement).checked)}
							aria-label="Toggle shuffle answers"
							data-power-item="true"
						/>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="flex items-center gap-2 px-3 pb-1 text-[11px] text-base-content/45">
		<Settings2 size={11} />
		<span>More options stay in quiz settings</span>
		<ArrowRight size={11} />
	</div>
</section>
