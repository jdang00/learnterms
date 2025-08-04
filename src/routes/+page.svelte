<script lang="ts">
	import { ArrowRight, Brain, Sigma, ChartScatter, LayoutDashboard } from 'lucide-svelte';
	import Mock from '$lib/components/mock.svelte';
	import Quiz from '$lib/components/quiz.svelte';
	import { useClerkContext } from 'svelte-clerk';
	import { fade, fly, scale } from 'svelte/transition';

	const ctx = useClerkContext();
	const userId = $derived(ctx.auth.userId);
</script>

<div class="flex flex-col items-center mt-8">
	<div class="w-full max-w-5xl mx-auto px-4 sm:px-12">
		<div in:fade={{ duration: 1000 }}>
			<div class="space-y-4 max-w-3xl">
				<h1 class="font-bold text-5xl lg:text-6xl mt-12 sm:mt-24 relative">
					<span class="text-primary relative">
						LearnTerms
						<span
							class="absolute inset-0 -z-10 bg-primary opacity-30 blur-xl rounded-lg transform -translate-y-1/2 top-1/2 animate-pulse"
						></span>
					</span>
					is Smarter Studying, Simplified.
				</h1>
				<p class="text-base-content text-2xl">
					Purpose-built tools to help you ace your exams—backed by data, driven by focus.
				</p>
			</div>

			{#if userId === null}
				<a
					class="btn btn-primary my-8"
					href="/sign-in"
					in:fly={{ y: 20, duration: 500, delay: 200 }}
				>
					Get Started <ArrowRight />
				</a>
			{:else}
				<a
					class="btn btn-primary my-8"
					href="/classes"
					in:fly={{ y: 20, duration: 500, delay: 200 }}
				>
					<LayoutDashboard /> Classes
				</a>
			{/if}
		</div>

		<div
			in:scale={{ duration: 800, delay: 200 }}
			class="mockup-browser border-base-300 border mt-8 hidden md:block"
		>
			<div class="mockup-browser-toolbar">
				<div class="input border-base-300 border">app.learnterms.com</div>
			</div>
			<div class="border-base-300 flex justify-center border-t px-6">
				<Mock />
			</div>
		</div>

		<div class="mt-16 lg:mt-32 flex flex-col lg:flex-row gap-y-10 gap-x-8 lg:gap-x-24">
			<div
				class="max-w-lg self-center lg:w-2/5 px-4 sm:px-0"
				in:fly={{ x: -40, duration: 800, delay: 100 }}
			>
				<h2 class="font-bold text-4xl">Laser Focused and Built for Mastery.</h2>
				<p class="text-xl mt-4">
					LearnTerms is a study platform full of tools built to make mastering complex topics easier
					and faster. Whether you're prepping for exams or fine-tuning your knowledge, LearnTerms is
					flexible, practical, and designed with you in mind.
				</p>
			</div>
			<div class="mockup-phone mt-8 lg:mt-0 mx-auto" in:fly={{ x: 40, duration: 800, delay: 200 }}>
				<div class="mockup-phone-camera"></div>
				<div class="mockup-phone-display grid place-content-center bg-base-100">
					<Quiz />
				</div>
			</div>
		</div>

		<div class="mt-36 px-4 sm:px-0" in:fade={{ duration: 1000 }}>
			<h2 class="font-bold text-5xl">Powered By The Latest and Greatest.</h2>
			<p class="text-2xl mt-4">
				Transform your studying by leveraging cutting edge features, all designed in a seamless
				experience.
			</p>
			<div class="mt-16">
				<div class="flex flex-col lg:flex-row gap-6">
					<div class="flex flex-col gap-y-2 lg:w-1/3" in:fade={{ duration: 800, delay: 100 }}>
						<Brain size="36" />
						<h3 class="font-semibold text-2xl">Artificial Intelligence</h3>
						<p class="text-lg">
							Advanced language models are utilized to generate accurate and detailed practice
							questions tailored to specific course content, offering an unmatched preparation
							experience.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3" in:fade={{ duration: 800, delay: 200 }}>
						<Sigma size="36" />
						<h3 class="font-semibold text-2xl">Smart Algorithms</h3>
						<p class="text-lg">
							Predictive models identify and prioritize terms and questions with the highest
							likelihood of appearing on quizzes and exams, ensuring targeted and efficient study
							sessions.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3" in:fade={{ duration: 800, delay: 300 }}>
						<ChartScatter size="36" />
						<h3 class="font-semibold text-2xl">Detailed Analytics</h3>
						<p class="text-lg">
							Comprehensive progress tracking analyzes performance data to provide actionable
							insights, enabling a more focused and effective approach to mastering complex topics.
						</p>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-36 px-4 sm:px-0" in:fade={{ duration: 1000 }}>
			<h2 class="font-bold text-4xl text-center">Crafted With Care, By People You Trust.</h2>
			<p class="text-lg mt-4 text-center">
				LearnTerms is actively developed by familiar faces who are committed to fine-tuning every
				feature to meet your needs. We’re in this together!
			</p>
			<div class="flex justify-center mt-10" in:scale={{ duration: 600, delay: 200 }}>
				<img
					src="https://utfs.io/f/DYlXFqnaImOrxA6g7hMjopGvhFXsSYTPmnUcH1rDawbJ7kQL"
					alt="Class of 2028"
					class="rounded-lg transform scale-95 transition duration-500 hover:scale-100 max-w-full"
				/>
			</div>
			<p class="text-base-content text-center mt-8">NSUOCO Class of 2028</p>
		</div>
	</div>
</div>
