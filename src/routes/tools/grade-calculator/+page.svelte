<script lang="ts">
	import { gradeStore } from '$lib/grade-calc/stores/gradeStore.svelte';
	import CourseSelector from '$lib/components/grade-calc/CourseSelector.svelte';
	import GradeDisplay from '$lib/components/grade-calc/GradeDisplay.svelte';
	import ComponentInput from '$lib/components/grade-calc/ComponentInput.svelte';
</script>

<div class="flex flex-col lg:fixed lg:inset-0 lg:overflow-hidden mt-2 lg:mt-18 min-h-screen mx-4">
	<div class="px-4 sm:px-6 pt-8 pb-4 shrink-0 ms-4">
		<header>
			<h1 class="text-2xl sm:text-4xl font-bold text-base-content text-center lg:text-left">Grade Calculator</h1>
			<p class="text-base-content/70 text-center lg:text-left">Fall 2025</p>
		</header>
	</div>
	<div class="flex flex-col lg:flex-row gap-6 lg:gap-12 flex-1 min-h-0 px-2 sm:px-6 pb-6 lg:overflow-hidden">
		<div class="lg:hidden">
			<div class="space-y-6">
				<CourseSelector />
				<GradeDisplay />
			</div>
		</div>
		<aside
			class="hidden lg:flex lg:flex-col overflow-y-auto overflow-x-hidden border border-base-300 rounded-4xl p-6 bg-base-100 backdrop-blur-md bg-opacity-80 shadow-lg w-[min(28rem,40vw)] xl:w-[min(32rem,38vw)] "
		>
			<div class="space-y-6">
				<CourseSelector />
				<GradeDisplay />
			</div>
		</aside>
		<section class="flex-1 min-w-0 overflow-visible lg:overflow-y-auto">
			<div class="space-y-6 pb-36 lg:pr-4">
				<h3 class="text-lg font-semibold text-base-content">Course Components</h3>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{#each gradeStore.selectedCourse.components as component}
						<ComponentInput {component} />
					{/each}
				</div>
			</div>
		</section>
	</div>
</div>
