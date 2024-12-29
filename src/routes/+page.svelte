<script lang="ts">
	import { ArrowRight, Brain, Sigma, ChartScatter, LayoutDashboard } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	import Mock from './mock.svelte';
</script>

<!--Hi mom-->
<div class="flex flex-col items-center mt-8">
	<div class="max-w-5xl mx-auto px-8 sm:px-12">
		<!-- Hero Header -->
		<div class="space-y-4 max-w-3xl">
			<h1 class="font-bold text-4xl lg:text-6xl mt-24 relative">
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
		{#if !data.loggedIn}
			<a class="btn btn-primary my-8" href="/sign-in">Get Started <ArrowRight /></a>
		{:else}
			<a class="btn btn-primary my-8" href="/pharm"> <LayoutDashboard /> Dashboard</a>
		{/if}

		<div class="mockup-browser border-base-300 border mt-8 hidden md:block">
			<div class="mockup-browser-toolbar">
				<div class="input border-base-300 border">app.learnterms.com</div>
			</div>
			<div class="border-base-300 flex justify-center border-t px-6"><Mock /></div>
		</div>
		<div class="mockup-browser border-base-300 border mt-8 max-w-sm md:hidden">
			<div class="mockup-browser-toolbar">
				<div class="input border-base-300 border">app.learnterms.com</div>
			</div>
			<div class="border-base-300 flex justify-center border-t px-6"><Mock /></div>
		</div>

		<div class="mt-32 flex flex-col lg:flex-row gap-x-8">
			<div class="max-w-lg self-center">
				<h2 class="font-bold text-4xl">Laser Focused and Built for Mastery.</h2>
				<p class="text-xl mt-4">
					LearnTerms is a free, open-source study plaform, full of tools built to make mastering
					complex topics easier and faster. Created by the Northeastern State University Oklahoma
					College of Optometry Class of 2028, it bridges the gap between platforms like Quizlet and
					Anki with unique, paywall-free features. Whether you're prepping for exams or fine-tuning
					your knowledge, LearnTerms is flexible, practical, and designed with you in mind.
				</p>
			</div>

			<div class="mockup-phone lg:mt-0 scale-75">
				<div class="camera"></div>
				<div class="display">
					<div class="artboard artboard-demo phone-4 bg-white">
						<img
							src="https://utfs.io/f/DYlXFqnaImOrHdvL2B8oz43pOdy8PbVBRIvwFe0Zuk5rYQxl"
							alt="learnterms"
							class="object-contain mt-24"
						/>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-20">
			<h2 class="font-bold text-5xl">Powered By The Latest and Greatest.</h2>
			<p class="text-2xl mt-4">
				Transform your studying by leveraging cutting edge features, all designed in a seamless
				experience.
			</p>

			<div class="mt-16">
				<div class="flex flex-col lg:flex-row gap-6">
					<div class="flex flex-col gap-y-2 lg:w-1/3">
						<Brain size="36" />
						<h3 class="font-semibold text-2xl">Artificial Intelligence</h3>
						<p class="text-lg">
							Advanced language models are utilized to generate accurate and detailed practice
							questions tailored to specific course content, offering an unmatched preparation
							experience.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3">
						<Sigma size="36" />
						<h3 class="font-semibold text-2xl">Smart Algorithms</h3>
						<p class="text-lg">
							Predictive models identify and prioritize terms and questions with the highest
							likelihood of appearing on quizzes and exams, ensuring targeted and efficient study
							sessions.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3">
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

		<div class="mt-36">
			<h2 class="font-bold text-4xl text-center">Crafted With Care, By People You Trust.</h2>
			<p class="text-lg mt-4">
				LearnTerms is actively developed by familiar faces who are committed to fine-tuning every
				feature to meet your needs. We’re in this together!
			</p>
			<img
				src="https://utfs.io/f/DYlXFqnaImOrxA6g7hMjopGvhFXsSYTPmnUcH1rDawbJ7kQL"
				alt="Class of 2028"
				class="mt-10 rounded-lg transform scale-95 transition duration-500 hover:scale-100 relative"
			/>

			<p class="text-base-content text-center mt-8">NSUOCO Class of 2028</p>
		</div>
	</div>
</div>
