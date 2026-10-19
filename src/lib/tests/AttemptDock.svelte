<script lang="ts">
	import {
		DOCK_ISLAND_CLASS,
		DOCK_PHONE_BAR_CLASS,
		dockGlass
	} from '$lib/components/quiz-dock/dockStyles';
	import { Button } from '$lib/components/ui/button';
	import Flag from '@lucide/svelte/icons/flag';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Eraser from '@lucide/svelte/icons/eraser';
	import type { AttemptRunnerState } from './attempt.svelte';

	let { runner, onSubmitRequest }: { runner: AttemptRunnerState; onSubmitRequest: () => void } =
		$props();
	const flagged = $derived(runner.currentResponse?.isFlagged ?? false);
</script>

<!-- Fixed bottom action bar (matches QuizDock floating style) -->
<div class={DOCK_ISLAND_CLASS}>
	<Button
		class={dockGlass('outline')}
		variant="outline"
		tone="neutral"
		onclick={() => runner.clearCurrent()}
	>
		Clear
	</Button>
	<Button
		class={dockGlass(flagged ? 'solid' : 'soft')}
		shape="circle"
		tone="warning"
		variant={flagged ? 'solid' : 'soft'}
		onclick={() => runner.toggleCurrentFlag()}
		aria-label={flagged ? 'Remove flag' : 'Flag for review'}
	>
		<Flag size={18} />
	</Button>
	<Button
		class={dockGlass('ghost')}
		variant="ghost"
		tone="neutral"
		onclick={() => void runner.flushSync(true)}
		title="Save progress"
	>
		<Save size={16} />
	</Button>

	<span
		class="mx-1 h-7 w-px shrink-0 bg-linear-to-b from-transparent via-foreground/18 to-transparent"
		aria-hidden="true"
	></span>

	<Button
		class={dockGlass('outline')}
		variant="outline"
		tone="neutral"
		shape="segment-start"
		onclick={() => runner.previousQuestion()}
		disabled={runner.currentIndex === 0}
	>
		<ArrowLeft size={18} />
	</Button>
	<Button
		class={dockGlass('outline')}
		variant="outline"
		tone="neutral"
		shape="segment-end"
		onclick={() => runner.nextQuestion()}
		disabled={runner.currentIndex === (runner.itemCount || 1) - 1}
	>
		<ArrowRight size={18} />
	</Button>

	<span
		class="mx-1 h-7 w-px shrink-0 bg-linear-to-b from-transparent via-foreground/18 to-transparent"
		aria-hidden="true"
	></span>

	<Button
		tone="primary"
		class="{dockGlass('solid')} gap-1"
		onclick={onSubmitRequest}
		disabled={runner.isSubmitting}
	>
		<Send size={14} />
		{runner.isSubmitting ? 'Submitting...' : 'Submit'}
	</Button>
</div>

<!-- Phone dock: same shape as the quiz dock -->
<div class={DOCK_PHONE_BAR_CLASS}>
	<div class="flex items-center gap-1 px-2 pt-2" role="toolbar" aria-label="Test controls">
		<div class="flex min-w-0 flex-1 items-center justify-center gap-1">
			<Button
				variant="ghost"
				tone="neutral"
				shape="circle"
				class="size-11"
				onclick={() => runner.clearCurrent()}
				aria-label="Clear answer"
			>
				<Eraser size={18} />
			</Button>
			<Button
				variant={flagged ? 'solid' : 'outline'}
				tone="warning"
				shape="circle"
				class="size-11"
				onclick={() => runner.toggleCurrentFlag()}
				aria-label={flagged ? 'Remove flag' : 'Flag for review'}
				aria-pressed={flagged}
			>
				<Flag size={18} />
			</Button>
			<Button
				variant={runner.isLastQuestion ? 'solid' : 'soft'}
				tone="primary"
				class="h-11 min-w-28 flex-1 gap-1.5"
				onclick={onSubmitRequest}
				disabled={runner.isSubmitting}
			>
				<Send size={16} />
				{runner.isSubmitting ? 'Submitting…' : 'Submit'}
			</Button>
		</div>
		<!-- The same split pill as the desktop dock. -->
		<div class="ms-1 flex shrink-0 items-center">
			<Button
				variant="outline"
				tone="neutral"
				class="size-11"
				shape="segment-start"
				onclick={() => runner.previousQuestion()}
				disabled={runner.currentIndex === 0}
				aria-label="Previous question"
			>
				<ArrowLeft size={18} />
			</Button>
			<Button
				variant="outline"
				tone="neutral"
				class="size-11"
				shape="segment-end"
				onclick={() => runner.nextQuestion()}
				disabled={runner.isLastQuestion}
				aria-label="Next question"
			>
				<ArrowRight size={18} />
			</Button>
		</div>
	</div>
</div>
