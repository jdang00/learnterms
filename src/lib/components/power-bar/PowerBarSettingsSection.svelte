<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { Switch } from '$lib/components/ui/switch';
	import { Command } from 'bits-ui';
	import { POWER_HEADING_CLASS } from './styles';

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

	// Rows are Command items so arrow keys reach them; Enter or a row click toggles the setting.
	// The inline controls stop propagation so a direct click doesn't toggle twice.
	const ROW_CLASS =
		'-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 outline-hidden transition-colors duration-100 data-selected:bg-muted/60';
	const stop = (event: Event) => event.stopPropagation();

	const showShuffle = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		return matchesQuery(query, ['shuffle', 'answers', 'answer', 'options', 'random']);
	});
</script>

<Command.Group value="settings">
	<Command.GroupHeading class={POWER_HEADING_CLASS}>Settings</Command.GroupHeading>
	<Command.GroupItems class="space-y-2">
		{#if showTheme || showAutoNext || showShuffle}
			<div class="surface p-3">
				{#if showTheme}
					<Command.Item
						value="setting:theme"
						class={ROW_CLASS}
						onSelect={() => onSetTheme?.(isDarkMode ? 'light' : 'dark')}
					>
						<div class="min-w-0">
							<p class="text-[13px] font-semibold">Theme</p>
							<p class="text-[11px] text-foreground/50">Switch between light and dark mode</p>
						</div>
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<div onclick={stop}>
							<ButtonGroup.Root>
								<Button
									size="xs"
									variant={isDarkMode ? 'ghost' : 'solid'}
									tone={isDarkMode ? 'neutral' : 'primary'}
									tabindex={-1}
									onclick={() => onSetTheme?.('light')}
								>
									<Sun size={13} />
									Light
								</Button>
								<Button
									size="xs"
									variant={isDarkMode ? 'solid' : 'ghost'}
									tone={isDarkMode ? 'primary' : 'neutral'}
									tabindex={-1}
									onclick={() => onSetTheme?.('dark')}
								>
									<Moon size={13} />
									Dark
								</Button>
							</ButtonGroup.Root>
						</div>
					</Command.Item>
				{/if}

				{#if showAutoNext}
					<div class="mt-2 border-t border-border pt-2 first:mt-0 first:border-t-0 first:pt-0">
						<Command.Item
							value="setting:auto-next"
							class={ROW_CLASS}
							onSelect={() => onSetAutoNext?.(!autoNextEnabled)}
						>
							<div class="min-w-0">
								<p class="text-[13px] font-semibold">Auto Next</p>
								<p class="text-[11px] text-foreground/50">Advance after correct answer</p>
							</div>
							<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
							<div onclick={stop} class="flex">
								<Switch
									size="sm"
									checked={autoNextEnabled}
									onCheckedChange={(checked) => onSetAutoNext?.(checked)}
									aria-label="Toggle auto next"
									tabindex={-1}
								/>
							</div>
						</Command.Item>
					</div>
				{/if}

				{#if showShuffle}
					<div class="mt-2 border-t border-border pt-2 first:mt-0 first:border-t-0 first:pt-0">
						<Command.Item
							value="setting:shuffle-answers"
							class={ROW_CLASS}
							onSelect={() => onSetShuffleAnswers?.(!optionsShuffleEnabled)}
						>
							<div class="min-w-0">
								<p class="text-[13px] font-semibold">Shuffle Answers</p>
								<p class="text-[11px] text-foreground/50">Randomize answer option order</p>
							</div>
							<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
							<div onclick={stop} class="flex">
								<Switch
									size="sm"
									checked={optionsShuffleEnabled}
									onCheckedChange={(checked) => onSetShuffleAnswers?.(checked)}
									aria-label="Toggle shuffle answers"
									tabindex={-1}
								/>
							</div>
						</Command.Item>
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex items-center gap-2 px-3 pb-1 text-[11px] text-foreground/45">
			<Settings2 size={11} />
			<span>More options stay in quiz settings</span>
			<ArrowRight size={11} />
		</div>
	</Command.GroupItems>
</Command.Group>
