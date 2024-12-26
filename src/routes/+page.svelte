<script lang="ts">
	import { ArrowRight, Brain, Sigma, ChartScatter } from 'lucide-svelte';

	import Mock from './mock.svelte';
</script>

<!--Hi mom-->
<div class="flex flex-col items-center mt-8">
	<div class="max-w-5xl mx-12 lg:mx-2">
		<!-- Hero Header -->
		<div class="space-y-4 max-w-2xl">
			<h1 class="font-bold text-5xl mt-24 relative">
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
		<a class="btn btn-primary my-8" href="/sign-in">Get Started <ArrowRight /></a>

		<div class="mockup-browser border-base-300 border mt-8 hidden md:block">
			<div class="mockup-browser-toolbar">
				<div class="input border-base-300 border">app.learnterms.com</div>
			</div>
			<div class="border-base-300 flex justify-center border-t px-4"><Mock /></div>
		</div>

		<div class="mt-32 flex flex-row flex-wrap gap-x-8">
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

			<div class="mockup-phone mt-8 lg:mt-0">
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

		<div class="mt-36">
			<h2 class="font-bold text-5xl">Powered By The Latest and Greatest.</h2>
			<p class="text-2xl mt-4">
				Transform your studying by leveraging cutting edge features, all designed in a seamless
				experience.
			</p>

			<div class="mt-16">
				<div class="flex lg:flex-row flex-col gap-6">
					<div class="flex flex-col gap-y-2 lg:w-1/3">
						<Brain size="36" />
						<h3 class="font-semibold text-2xl">Artificial Intelligence</h3>
						<p class="text-lg">
							Using large language models trained on course content, you get to experience accurate
							and detailed practice questions you won't find anywhere else.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3">
						<Sigma size="36" />
						<h3 class="font-semibold text-2xl">Smart Algorithms</h3>
						<p class="text-lg">
							We use predictive models to highlight the terms and questions most likely to appear on
							your quizzes and exams. Proven to be accurate.
						</p>
					</div>
					<div class="flex flex-col gap-y-2 lg:w-1/3">
						<ChartScatter size="36" />
						<h3 class="font-semibold text-2xl">Detailed Analytics</h3>
						<p class="text-lg">
							Every click, quiz, and session informs your progress. LearnTerms provides actionable
							feedback to help you study more efficiently.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
