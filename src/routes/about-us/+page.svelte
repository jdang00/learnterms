<script lang="ts">
	import { resolve } from '$app/paths';
	import PublicPage from '$lib/components/landing/PublicPage.svelte';
</script>

<svelte:head>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "AboutPage",
			"name": "About — LearnTerms",
			"url": "https://learnterms.com/about-us",
			"description": "Justin Dang is an optometry student and the developer of LearnTerms. Here's how the project started.",
			"inLanguage": "en",
			"isAccessibleForFree": true,
			"mainEntity": {
				"@type": "Person",
				"name": "Justin Dang"
			}
		}
	</script>
</svelte:head>

<PublicPage title="About" width="narrow">
	<article>
		<div class="space-y-5 text-base leading-relaxed text-base-content/80 sm:text-lg">
			<p>
				I’m Justin Dang, an optometry student at Northeastern State University Oklahoma College of
				Optometry and the developer of LearnTerms. Before optometry school, I studied computer
				science, with a focus on AI and human-computer interaction.
			</p>
			<p>
				I started building LearnTerms to help with my own coursework. There were a lot of lectures
				to keep up with, and I wanted practice questions that followed what we were learning in
				class. I shared what I was making with a few classmates, and the project grew from there.
			</p>
		</div>

		<figure class="my-8 sm:my-10">
			<img
				src="https://axcaluti7p.ufs.sh/f/DYlXFqnaImOrN7PbXjXzP0UTz89wOGJKi17DasVtufbylgkQ"
				alt="Justin Dang coding on his laptop"
				class="w-full rounded-xl"
				loading="lazy"
				decoding="async"
			/>
			<figcaption class="mt-3 text-sm text-base-content/60">
				Me, coding in the middle of lab.
			</figcaption>
		</figure>

		<div class="space-y-5 text-base leading-relaxed text-base-content/80 sm:text-lg">
			<p>
				My interest in the project comes from being on both sides of it: I write the software, and I
				also have to sit down and study. That gives me plenty of opportunities to notice what’s
				confusing, what takes too many clicks, and what I actually find useful. Feedback from
				classmates helps me see the things I miss.
			</p>
			<p>
				LearnTerms is meant to be one part of studying, alongside lectures, textbooks, lab, and
				other practice resources. I want it to help us work through questions, understand our
				mistakes, and go back to the course material when something hasn’t clicked yet.
			</p>
			<p>
				I build and maintain it myself while I’m in school. If something is frustrating, a question
				seems off, or you have an idea, <a
					class="link underline-offset-4"
					href={resolve('/contact')}>let me know</a
				>. I’d like to hear it.
			</p>
		</div>
	</article>
</PublicPage>
