<script lang="ts">
	import { Questionnaire as QuestionnairePrimitive } from '@shadcn-svelte/primitives/questionnaire';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: QuestionnairePrimitive.InputProps = $props();
</script>

<div
	data-slot="questionnaire-input-wrapper"
	class="w-full group/questionnaire-input relative min-w-0"
>
	<QuestionnairePrimitive.Input
		bind:ref
		data-slot="questionnaire-input"
		class={cn(
			'bg-input/50 border-transparent focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-3xl border px-3 py-1 text-base focus-visible:ring-3 aria-invalid:ring-3 md:text-sm min-h-11 w-full min-w-0 transition-[color,box-shadow,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0',
			'selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground',
			className
		)}
		{...restProps}
	/>
</div>
