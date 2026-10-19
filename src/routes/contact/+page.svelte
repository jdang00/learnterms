<script lang="ts">
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
</script>

<PublicPage
	title="Contact"
	lede="Support on LearnTerms is simple: you’re talking to me, the guy who built it. No sales teams, no canned replies — just me making sure it works for you. Feel free to send me a DM for whatever it is you need."
	width="narrow"
>
	<section>
		<a
			href="https://www.instagram.com/justin_a_dang/"
			target="_blank"
			rel="noopener"
			aria-label="Open Instagram profile @justin_a_dang in a new tab"
			class="panel-graph block p-6 transition-colors hover:border-primary/50 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-primary/40"
		>
			<div>
				<div class="flex items-center gap-4">
					<Avatar.Root
						class="size-20 ring-2 ring-primary ring-offset-2 ring-offset-background sm:size-24"
					>
						<Avatar.Image
							src="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOrNYQ0L9zP0UTz89wOGJKi17DasVtufbylgkQF"
							alt="Instagram profile avatar"
						/>
					</Avatar.Root>

					<div class="min-w-0">
						<h2 class="truncate text-xl font-semibold">@justin_a_dang</h2>
						<p class="text-foreground/70">Send me a message and let me know how I can help you!</p>
					</div>

					<!-- Instagram icon (decorative) -->
					<svg
						class="ml-auto h-6 w-6 text-secondary opacity-90"
						viewBox="0 0 24 24"
						aria-hidden="true"
						focusable="false"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
						<circle cx="12" cy="12" r="4"></circle>
						<circle cx="17.5" cy="6.5" r="1.25" fill="currentColor"></circle>
					</svg>
				</div>
			</div>
		</a>
	</section>
</PublicPage>
