<script lang="ts">
	import Quiz from './quiz/quiz.svelte';
</script>

<div class="flex items-center justify-between w-full flex-col p-8 min-h-screen">
	<div class="w-full max-w-3xl">
		<div class="flex space-x-3 items-end">
			<a class="font-medium mt-3 text-3xl" href="/">Introduction to Optometry Terms</a>
			<p class="font-bold text-gray-400">BETA</p>
		</div>
		<div class="divider"></div>
		<div class="flex flex-col space-y-6 items-center">
			<Quiz />
			<a class="btn btn-active btn-secondary max-w-lg" href="/terms">View all cards</a>
		</div>
	</div>
</div>

<footer class="footer footer-center text-base-content p-4">
	<aside>
		<p>Copyright © {new Date().getFullYear()} - Justin A. Dang</p>
	</aside>
</footer>
