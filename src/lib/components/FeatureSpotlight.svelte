<script lang="ts">
	import { resolve } from '$app/paths';
	import { fly, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import History from '@lucide/svelte/icons/history';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Users from '@lucide/svelte/icons/users';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	type Feature = { title: string; description: string; icon: string; href?: string };
	type Announcement = {
		id: string;
		eyebrow: string;
		title: string;
		description: string;
		features: Feature[];
		ctaLabel: string;
	};

	let {
		announcement,
		open,
		saving = false,
		error = null,
		showCta = false,
		canOpen,
		ondismiss,
		onopenfeature,
		oncta
	}: {
		announcement: Announcement;
		open: boolean;
		saving?: boolean;
		error?: string | null;
		showCta?: boolean;
		canOpen: (feature: Feature) => boolean;
		ondismiss: () => void;
		onopenfeature: (feature: Feature) => void;
		oncta: () => void;
	} = $props();

	const icons: Record<string, typeof Sparkles> = {
		sparkles: Sparkles,
		history: History,
		users: Users,
		clipboard: ClipboardCheck,
		layout: LayoutDashboard
	};
	const tones = [
		{
			name: 'primary',
			tile: 'bg-primary text-primary-foreground',
			wash: '--color-primary'
		},
		{
			name: 'secondary',
			tile: 'bg-secondary text-secondary-foreground',
			wash: '--color-secondary'
		},
		{
			name: 'accent',
			tile: 'bg-accent text-accent-foreground',
			wash: '--color-accent'
		},
		{
			name: 'success',
			tile: 'bg-success text-success-foreground',
			wash: '--color-success'
		},
		{ name: 'info', tile: 'bg-info text-info-foreground', wash: '--color-info' }
	] as const;

	let active = $state(0);
	let direction = $state(1);
	const reduced = $derived(prefersReducedMotion.current);
	const features = $derived(announcement.features);
	const current = $derived(features[active] ?? features[0]);
	const tone = $derived(tones[active % tones.length]);
	const CurrentIcon = $derived(icons[current?.icon] ?? LayoutDashboard);

	function select(index: number) {
		const next = (index + features.length) % features.length;
		direction = next >= active ? 1 : -1;
		active = next;
	}

	function onTabKey(event: KeyboardEvent) {
		const keys: Record<string, number> = {
			ArrowDown: 1,
			ArrowRight: 1,
			ArrowUp: -1,
			ArrowLeft: -1
		};
		if (event.key in keys) {
			event.preventDefault();
			select(active + keys[event.key]);
			(document.getElementById(`spotlight-tab-${active}`) as HTMLElement | null)?.focus();
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(next) => !next && ondismiss()}>
	<Dialog.Content
		showCloseButton={false}
		aria-labelledby="spotlight-title"
		sheet
		class="z-[1000] flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl"
	>
		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
			<div class="relative px-5 pt-5 sm:px-8 sm:pt-8">
				<Dialog.CornerClose onclick={ondismiss} disabled={saving} label="Close" />
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-ink"
				>
					<Sparkles size={13} class="sparkle-spin" />
					{announcement.eyebrow}
				</span>
				<h2
					id="spotlight-title"
					class="mt-3 pr-8 text-xl font-bold leading-tight text-balance sm:pr-0 sm:text-3xl"
				>
					{announcement.title}
				</h2>
				<p class="mt-1.5 max-w-xl text-sm leading-relaxed text-foreground/60">
					{announcement.description}
				</p>
			</div>

			<div
				class="grid gap-3 px-5 py-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-4 sm:px-8 sm:py-6"
			>
				<div
					class="-mx-5 flex gap-1 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0"
					role="tablist"
					aria-orientation="vertical"
					aria-label="What's new"
					tabindex="-1"
					onkeydown={onTabKey}
				>
					{#each features as feature, i (feature.title)}
						{@const Icon = icons[feature.icon] ?? LayoutDashboard}
						{@const selected = i === active}
						{@const t = tones[i % tones.length]}
						<button
							id="spotlight-tab-{i}"
							type="button"
							role="tab"
							aria-selected={selected}
							aria-controls="spotlight-panel"
							tabindex={selected ? 0 : -1}
							class="group flex shrink-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-left sm:shrink sm:gap-3 sm:px-3 sm:py-2.5 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none {selected
								? 'bg-muted font-semibold text-foreground'
								: 'text-foreground/65 hover:bg-muted/60 hover:text-foreground'}"
							onclick={() => select(i)}
							in:fly={{
								x: reduced ? 0 : -10,
								duration: reduced ? 0 : 300,
								delay: reduced ? 0 : 120 + i * 50,
								easing: cubicOut
							}}
						>
							<span
								class="grid size-7 shrink-0 place-items-center rounded-xl sm:size-8 transition-all duration-200 motion-reduce:transition-none {selected
									? `${t.tile} scale-105 shadow-sm`
									: 'bg-muted text-foreground/55 group-hover:scale-105'}"
							>
								<Icon size={16} />
							</span>
							<span class="whitespace-nowrap sm:min-w-0 sm:flex-1 sm:truncate">{feature.title}</span
							>
						</button>
					{/each}
				</div>

				<div
					id="spotlight-panel"
					role="tabpanel"
					aria-labelledby="spotlight-tab-{active}"
					class="relative min-h-52 overflow-hidden surface p-5 sm:min-h-60 sm:p-6"
				>
					<div
						class="pointer-events-none absolute inset-0 transition-[background] duration-500"
						style:background="radial-gradient(circle at 85% 0%, color-mix(in oklab, var({tone.wash})
						14%, transparent), transparent 60%)"
					></div>
					<div
						class="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
					></div>
					{#key active}
						<div
							class="relative flex h-full flex-col"
							in:fly={{
								x: reduced ? 0 : 16 * direction,
								duration: reduced ? 0 : 280,
								easing: cubicOut
							}}
						>
							<span
								class="grid size-12 place-items-center rounded-2xl shadow-md sm:size-14 {tone.tile}"
								in:scale={{ duration: reduced ? 0 : 420, start: 0.5, delay: 60, easing: backOut }}
							>
								<CurrentIcon size={26} />
							</span>
							<h3 class="mt-4 text-lg sm:mt-5 font-semibold">{current.title}</h3>
							<p class="mt-1.5 text-sm leading-relaxed text-pretty text-foreground/65">
								{current.description}
							</p>
							<div class="mt-auto flex items-center justify-between gap-3 pt-6">
								<span class="flex items-center gap-1.5" aria-hidden="true">
									{#each features as feature, i (feature.title)}
										<span
											class="h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none {i ===
											active
												? `w-5 ${tone.tile}`
												: 'w-1.5 bg-foreground/15'}"
										></span>
									{/each}
								</span>
								<span class="flex items-center gap-1">
									{#if canOpen(current)}
										<Button
											size="sm"
											variant="soft"
											tone={tone.name}
											class="group gap-1 transition-all hover:gap-2"
											onclick={() => onopenfeature(current)}
										>
											Open <ArrowRight
												size={14}
												class="transition-transform group-hover:translate-x-0.5"
											/>
										</Button>
									{/if}
									<Button
										variant="ghost"
										tone="neutral"
										size="sm"
										shape="circle"
										aria-label="Previous feature"
										onclick={() => select(active - 1)}><ArrowLeft size={15} /></Button
									>
									<Button
										variant="ghost"
										tone="neutral"
										size="sm"
										shape="circle"
										aria-label="Next feature"
										onclick={() => select(active + 1)}><ArrowRight size={15} /></Button
									>
								</span>
							</div>
						</div>
					{/key}
				</div>
			</div>

			{#if error}
				<div
					class="mx-5 mb-4 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error-ink sm:mx-8"
					role="alert"
				>
					{error}
				</div>
			{/if}
		</div>

		<div
			class="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border bg-muted/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4"
		>
			<a
				href={resolve('/changelog')}
				class="text-xs text-foreground/50 transition-colors hover:text-primary-ink"
				onclick={ondismiss}>See all updates</a
			>
			<div class="flex items-center gap-2">
				{#if showCta}
					<Button variant="ghost" tone="neutral" size="sm" onclick={oncta}>
						{announcement.ctaLabel}
					</Button>
				{/if}
				<Button
					size="sm"
					class="px-5 shadow-sm shadow-primary/25"
					onclick={ondismiss}
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Got it'}
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.sparkle-spin) {
		animation: sparkle-spin 1.2s ease-out 0.3s 1;
	}
	@keyframes sparkle-spin {
		0% {
			transform: rotate(0) scale(1);
		}
		50% {
			transform: rotate(180deg) scale(1.3);
		}
		100% {
			transform: rotate(360deg) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.sparkle-spin) {
			animation: none;
		}
	}
</style>
