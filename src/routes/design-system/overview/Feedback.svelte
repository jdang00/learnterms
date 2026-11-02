<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Flag from '@lucide/svelte/icons/flag';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Info from '@lucide/svelte/icons/info';
	import Library from '@lucide/svelte/icons/library';
	import Plus from '@lucide/svelte/icons/plus';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { RadialProgress } from '#lib/components/ui/radial-progress/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { LoadingState, Spinner } from '#lib/components/ui/spinner/index.js';
	import ErrorDisplay from '#lib/components/ErrorDisplay.svelte';
	import ResultBanner from '#lib/components/ResultBanner.svelte';
	import ShimmerText from '#lib/components/ShimmerText.svelte';
	import Category from './Category.svelte';
	import Spec from './Spec.svelte';

	let banner = $state({ checkResult: '', checkCount: 0 });
	function check(result: string) {
		banner = { checkResult: result, checkCount: banner.checkCount + 1 };
	}
</script>

<Category
	id="feedback"
	summary="Alert for a message that stays, toast for one that passes. Spinner inside controls, LoadingState for an area, Skeleton for a layout that is on its way."
>
	<Spec title="Alert" src="ui/alert" wide>
		<div class="grid gap-3 md:grid-cols-2">
			<Alert.Root tone="error">
				<Info />
				<Alert.Title>Could not save the question</Alert.Title>
				<Alert.Description>Check your connection and try again.</Alert.Description>
			</Alert.Root>
			<Alert.Root tone="warning">
				<Flag />
				<Alert.Title>3 flagged questions</Alert.Title>
				<Alert.Description>Review them before the exam.</Alert.Description>
			</Alert.Root>
			<Alert.Root tone="success">
				<Check />
				<Alert.Title>Module complete</Alert.Title>
			</Alert.Root>
			<Alert.Root tone="info">
				<Info />
				<Alert.Title>Source · Intro to Optometry, p. 14</Alert.Title>
			</Alert.Root>
		</div>
	</Spec>

	<Spec
		title="Check result"
		src="ResultBanner"
		note="The pill that drops in after Check on a quiz question."
	>
		<div class="flex flex-wrap gap-2">
			<Button size="sm" variant="soft" tone="success" onclick={() => check('Correct!')}
				>Correct</Button
			>
			<Button size="sm" variant="soft" tone="error" onclick={() => check('Not quite yet.')}
				>Incorrect</Button
			>
		</div>
		<ResultBanner bind:qs={banner} />
	</Spec>

	<Spec title="Progress" src={['ui/progress', 'ui/radial-progress']}>
		<div class="space-y-3">
			<Progress value={60} />
			<Progress value={80} tone="success" />
			<Progress value={25} tone="warning" />
		</div>
		<div class="mt-4 flex items-center gap-3">
			<RadialProgress value={60} class="text-xs">60%</RadialProgress>
			<RadialProgress value={88} tone="success" thickness={6} class="size-16 text-sm"
				>88%</RadialProgress
			>
			<RadialProgress value={42} tone="error" class="text-xs">42%</RadialProgress>
		</div>
	</Spec>

	<Spec title="Loading" src={['ui/spinner', 'ui/skeleton', 'ShimmerText']}>
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-4">
				<Spinner />
				<Button size="sm" loading>Saving</Button>
				<LoadingState inline label="Loading tags…" />
			</div>
			<LoadingState label="Building slide deck preview…" class="surface-muted py-6" />
			<p class="text-sm">
				<ShimmerText text="Drafting 12 questions…" tone="primary" class="font-medium" />
			</p>
			<div class="space-y-2">
				<Skeleton class="h-4 w-3/4" />
				<Skeleton class="h-4 w-1/2" />
			</div>
		</div>
	</Spec>

	<Spec
		title="Empty"
		src="ui/empty"
		note="icon or emoji media, on surface-dashed for drop targets."
		wide
	>
		<div class="grid gap-3 md:grid-cols-3">
			<Empty.Root class="surface-dashed py-8">
				<Empty.Header>
					<Empty.Media variant="icon" class="size-14 bg-primary/10 text-primary-ink [&_svg]:size-6"
						><Library /></Empty.Media
					>
					<Empty.Title>Your library is empty</Empty.Title>
					<Empty.Description>Add a PDF to make it searchable.</Empty.Description>
				</Empty.Header>
				<Empty.Content><Button size="sm"><Plus />Add file</Button></Empty.Content>
			</Empty.Root>
			<Empty.Root class="surface py-8">
				<Empty.Header>
					<Empty.Media variant="emoji">📚</Empty.Media>
					<Empty.Title>No modules yet</Empty.Title>
					<Empty.Description>Modules appear once they are added.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
			<Empty.Root class="surface-muted py-8">
				<Empty.Header>
					<Empty.Media variant="icon"><Inbox /></Empty.Media>
					<Empty.Title>No flagged questions</Empty.Title>
					<Empty.Description>Flag a question while studying and it shows up here.</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
		</div>
	</Spec>

	<Spec
		title="Load errors"
		src="ErrorDisplay"
		note="An expired session reads as routine; anything else offers a reload."
	>
		<div class="grid gap-3 sm:grid-cols-2">
			<ErrorDisplay
				error={new Error('Network down')}
				showReload
				class="surface-muted"
				size="small"
			/>
			<ErrorDisplay
				error={new Error('Session expired')}
				showReload
				class="surface-muted"
				size="small"
			/>
		</div>
	</Spec>
</Category>
