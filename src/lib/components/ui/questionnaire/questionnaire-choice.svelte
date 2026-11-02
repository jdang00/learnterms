<script lang="ts">
	import { Questionnaire as QuestionnairePrimitive } from '@shadcn-svelte/primitives/questionnaire';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		children,
		class: className,
		...restProps
	}: QuestionnairePrimitive.ChoiceProps = $props();
</script>

<QuestionnairePrimitive.Choice
	bind:ref
	data-slot="questionnaire-choice"
	class={cn(
		'border-input hover:bg-input/40 data-checked:border-primary/40 data-checked:bg-primary/10 data-invalid:border-destructive has-[>input:focus-visible]:border-ring has-[>input:focus-visible]:ring-ring/50 gap-2.5 rounded-3xl border px-4 py-3 text-sm has-[>input:focus-visible]:ring-3 group/questionnaire-choice relative flex min-h-11 cursor-pointer items-start text-start transition-colors outline-none select-none',
		'data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
		className
	)}
	{...restProps}
>
	<QuestionnairePrimitive.ChoiceInput
		data-slot="questionnaire-choice-input"
		class="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
	/>
	<span
		aria-hidden="true"
		data-slot="questionnaire-choice-indicator"
		class="bg-input/90 group-data-checked/questionnaire-choice:bg-primary dark:group-data-checked/questionnaire-choice:bg-primary group-data-checked/questionnaire-choice:text-primary-foreground group-data-checked/questionnaire-choice:border-primary size-4 translate-y-[--spacing(0.45)] group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 rounded-[5px] border-transparent pointer-events-none relative flex shrink-0 items-center justify-center border group-data-[type=radio]/questionnaire-choice:rounded-full"
	>
		<span
			data-slot="questionnaire-choice-indicator-dot"
			class="bg-primary-foreground size-2 dark:size-2.5 hidden rounded-full group-data-[type=checkbox]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
		></span>
		<CheckIcon
			data-slot="questionnaire-choice-indicator-check"
			class="size-3.5 hidden group-data-[type=radio]/questionnaire-choice:hidden group-data-checked/questionnaire-choice:block"
		/>
	</span>
	<QuestionnairePrimitive.ChoiceLabel
		data-slot="questionnaire-choice-label"
		class="gap-1 flex min-w-0 flex-1 flex-col leading-snug"
	>
		{@render children?.()}
	</QuestionnairePrimitive.ChoiceLabel>
	<QuestionnairePrimitive.ChoiceShortcut
		data-slot="questionnaire-choice-shortcut"
		class="border-primary/10 bg-background/80 text-muted-foreground size-5 translate-y-[--spacing(0.45)] group-has-data-[slot=questionnaire-choice-description]/questionnaire-choice:translate-y-0.5 items-center justify-center rounded-full border font-mono text-[0.625rem] font-medium leading-none pointer-events-none ms-auto hidden shrink-0 group-data-[shortcut]/questionnaire-choice:inline-flex"
	/>
</QuestionnairePrimitive.Choice>
