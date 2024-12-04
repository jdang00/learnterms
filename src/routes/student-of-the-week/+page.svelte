<script lang="ts">
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
	<h1 class="text-4xl font-bold mt-5">2024 NSUOCO Division 1 Ping Pong Tournament CHAMPION</h1>
	<h2 class="text-gray-400">December 4, 2024</h2>

	<div class="flex flex-col md:flex-row md:space-x-16 justify-center items-center mt-12">
		<img
			class="object-contain h-96 mb-8"
			alt="Champion"
			src={'https://utfs.io/f/DYlXFqnaImOreuJb2ZbxHBVn21bZq7P8ofUF4rlcphAwxv3y'}
		/>
		<div class="self-start">
			<h2 class="text-4xl mb-3 font-medium">Courtney Swift</h2>
			<h2 class="text-xl font-semibold mt-5">Notable facts:</h2>
			<ul class="ms-8">
				<li>FEIN</li>
				<li>FEIN</li>
				<li>FEIN</li>
				<li>FEIN</li>
				<li>FEIN</li>
			</ul>
		</div>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>
