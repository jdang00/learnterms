<script lang="ts">
	import { docsNav } from '$lib/docs/nav.js';
</script>

<svelte:head>
	<title>Admin Documentation - LearnTerms</title>
	<meta name="description" content="LearnTerms admin documentation and guides" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-4xl font-bold text-base-content mb-8">Admin Documentation</h1>

		<p class="text-lg text-base-content/80 mb-8">
			Comprehensive guides for managing and administering LearnTerms content and systems.
		</p>

		<div class="grid gap-6 md:grid-cols-2">
			{#each docsNav.find(section => section.title === 'Admin')?.items || [] as item}
				<div class="card bg-base-100 shadow-lg">
					<div class="card-body">
						<h2 class="card-title text-primary">
							<a href={item.path} class="hover:text-primary-focus">
								{item.title}
							</a>
						</h2>
						<p class="text-base-content/70">
							{item.title === 'Content Library'
								? 'Manage and organize your course content, documents, and learning materials.'
								: 'Learn about the AI models and generation systems used by LearnTerms.'}
						</p>
						<div class="card-actions justify-end">
							<a href={item.path} class="btn btn-primary btn-sm">Read Guide</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
