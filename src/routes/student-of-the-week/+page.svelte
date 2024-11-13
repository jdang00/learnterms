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
	<h1 class="text-4xl font-bold mt-5">Student of the Week</h1>
	<h2 class="text-gray-400">(changes every month)</h2>

	<div class="flex flex-col md:flex-row md:space-x-16 justify-center items-center mt-12">
		<img
			class="object-contain h-96 mb-8"
			alt="Brayden Dyer"
			src={'https://scontent-dfw5-2.xx.fbcdn.net/v/t39.30808-6/462971281_2020148811755216_8068748815958606949_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=PWiiOuxnu-sQ7kNvgEzRMfu&_nc_zt=23&_nc_ht=scontent-dfw5-2.xx&_nc_gid=A0bdFfMwaGLjYoAWDJTWNKR&oh=00_AYAZ_r41NHLMjktJBdFF4rybFqBkVP2ik9R90DwERB3y3Q&oe=6739D874'}
		/>
		<div class="self-start">
			<h2 class="text-4xl mb-3 font-medium">Brayden Dyer</h2>
			<h2 class="text-xl font-semibold mt-5">Notable facts:</h2>
			<ul class="ms-8">
				<li>2 time MVP NSUOCO 2024 Intramural Football and Soccer</li>
				<li>Newly married</li>
				<li>Ping pong legend</li>
				<li>Most dripped out optometry student on a daily basis</li>
				<li>Sharpest haircut</li>
			</ul>
		</div>
	</div>
</div>

<style>
	ul {
		list-style-type: '✨ ';
	}
</style>
