<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		title = 'Ready to study smarter?',
		body = 'Join your class or start your own. Reach out to get your cohort started today.'
	}: { title?: string; body?: string } = $props();
</script>

<section class="mt-20 border-t border-foreground/10 px-6 py-14 text-center sm:px-10">
	<h2 class="text-3xl font-bold sm:text-4xl">{title}</h2>
	<p class="mx-auto mt-4 max-w-lg text-foreground/70">{body}</p>
	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		<Button href={resolve('/sign-in')} size="lg" class="px-8">
			Start studying
			<ArrowRight size={18} />
		</Button>
		<Button href={resolve('/contact')} variant="ghost" tone="neutral" size="lg" class="px-6">
			Sign your school up
		</Button>
	</div>
</section>
