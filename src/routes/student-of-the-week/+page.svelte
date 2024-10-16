<script lang="ts">
	import CSwift from '$lib/c_swift.webp';
	import { Confetti } from 'svelte-confetti';
</script>

<div
	style="
 position: fixed;
 top: -50px;
 left: 0;
 height: 100vh;
 width: 100vw;
 display: flex;
 justify-content: center;
 overflow: hidden;
 pointer-events: none;"
>
	<Confetti
		x={[-5, 5]}
		y={[0, 0.1]}
		delay={[500, 2000]}
		duration="2000"
		amount="200"
		fallDistance="100vh"
	/>
</div>
<div class="flex flex-col items-center mt-5">
	<h1 class="text-4xl font-bold mt-5">Student of the Week</h1>
	<h2 class="text-gray-400">(changes every month)</h2>

	<div class="flex flex-col md:flex-row md:space-x-16 justify-center items-center mt-12">
		<img class="object-contain h-96 mb-8" alt="Courtney Swift" src={CSwift} />
		<div class="self-start">
			<h2 class="text-4xl mb-3 font-medium">Courtney Swift</h2>
			<h2 class="text-xl font-semibold mt-5">Notable facts:</h2>
			<ul class="ms-8">
				<li>Twelve time US Open Women's Singles Champion</li>
				<li>Successfully terminated the life of a wasp by herself</li>
				<li>Avid reality TV show enjoyer</li>
				<li>Polish features</li>
				<li>Avid golfer</li>
			</ul>
		</div>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>
