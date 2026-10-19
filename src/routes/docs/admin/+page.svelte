<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { docsNav } from '$lib/docs/nav.js';
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="font-display text-4xl font-bold text-foreground mb-8">Admin Documentation</h1>

		<p class="text-lg text-foreground/80 mb-8">
			Comprehensive guides for managing and administering LearnTerms content and systems.
		</p>

		<div class="grid gap-6 md:grid-cols-2">
			{#each docsNav.find((section) => section.title === 'Admin')?.items || [] as item (item.path)}
				<Card.Root class="bg-background shadow-lg">
					<Card.Header>
						<Card.Title class="text-xl font-semibold">
							<h2>
								<a href={resolve(item.path)} class="text-primary-ink">
									{item.title}
								</a>
							</h2>
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-foreground/70">
							{item.title === 'Content Library'
								? 'Manage and organize your course content, documents, and learning materials.'
								: 'Learn about the AI models and generation systems used by LearnTerms.'}
						</p>
					</Card.Content>
					<Card.Footer class="justify-end">
						<Button href={resolve(item.path)} size="sm">Read Guide</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</div>
</div>
