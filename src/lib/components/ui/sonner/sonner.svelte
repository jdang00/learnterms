<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { theme } from '$lib/theme.svelte';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme={$theme}
	position="bottom-right"
	class="toaster group"
	style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--line); --border-radius: 1rem;"
	toastOptions={{
		classes: {
			toast: 'font-sans! gap-3! px-4! py-3.5! shadow-lg! shadow-black/5!',
			title: 'font-semibold! text-sm!',
			description: 'text-muted-foreground! text-sm!',
			actionButton: 'rounded-full! bg-primary! text-primary-foreground! font-semibold! px-3!',
			cancelButton: 'rounded-full! bg-muted-strong! text-foreground! font-semibold! px-3!',
			success: '[&_[data-icon]]:text-success-ink',
			error: '[&_[data-icon]]:text-error-ink',
			warning: '[&_[data-icon]]:text-warning-ink',
			info: '[&_[data-icon]]:text-info-ink'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-[1.125rem]" />
	{/snippet}
	{#snippet errorIcon()}
		<CircleAlertIcon class="size-[1.125rem]" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-[1.125rem]" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-[1.125rem]" />
	{/snippet}
</Sonner>
