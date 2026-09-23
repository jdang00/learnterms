<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { resolve } from '$app/paths';

	let {
		title = 'Ready to study smarter?',
		body = 'Join your class or start your own. Reach out to get your cohort started today.'
	}: { title?: string; body?: string } = $props();
</script>

<section class="mt-20 border-t border-base-content/10 px-6 py-14 text-center sm:px-10">
	<h2 class="text-3xl font-bold sm:text-4xl">{title}</h2>
	<p class="mx-auto mt-4 max-w-lg text-base-content/70">{body}</p>
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<a href={resolve('/sign-in')} class="btn btn-primary btn-lg rounded-full px-8">
			Start studying
			<ArrowRight size={18} />
		</a>
		<a href={resolve('/contact')} class="btn btn-ghost btn-lg rounded-full px-6">
			Sign your school up
		</a>
	</div>
</section>
