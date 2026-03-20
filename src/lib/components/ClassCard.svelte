<script module lang="ts">
	const palettes = [
		{ base: '#7c6fcd', light: '#a89be0', dark: '#5a4ea3' },
		{ base: '#5b8fd9', light: '#87aee6', dark: '#3d6db5' },
		{ base: '#e07baa', light: '#ea9fc3', dark: '#c55a8a' },
		{ base: '#5bba7a', light: '#84d09c', dark: '#3d9a5e' },
		{ base: '#d97b5b', light: '#e6a087', dark: '#b55c3d' },
		{ base: '#c9a84c', light: '#dcc278', dark: '#a68a32' },
		{ base: '#4cb5bf', light: '#78cdd5', dark: '#32959e' },
		{ base: '#9b6fc9', light: '#b893d9', dark: '#7a4eab' },
		{ base: '#6899d4', light: '#92b5e2', dark: '#4a78b3' },
		{ base: '#d4886a', light: '#e2a892', dark: '#b3684a' },
		{ base: '#5aad8e', light: '#82c5ab', dark: '#3e8e70' },
		{ base: '#cc7191', light: '#db96ae', dark: '#ab5274' }
	];
</script>

<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import type { ClassWithSemester } from '../types';
	interface Props {
		classItem: ClassWithSemester;
		onSelect: (classItem: ClassWithSemester) => void;
	}

	let { classItem, onSelect }: Props = $props();

	function hashStr(s: string): number {
		let h = 0;
		for (let i = 0; i < s.length; i++) {
			h = ((h << 5) - h + s.charCodeAt(i)) | 0;
		}
		return Math.abs(h);
	}

	const hash = $derived(hashStr(classItem._id));
	const palette = $derived(palettes[hash % palettes.length]);
	const patternAngle = $derived(25 + (hash % 4) * 15);
	const patternVariant = $derived(hash % 3);
</script>

<div in:fade={{ duration: 300 }} class="relative group">
	<button onclick={() => onSelect(classItem)} class="w-full text-left" aria-label={`Open class ${classItem.name}`}>
		<div class="card-root relative h-64 rounded-2xl bg-base-100 border-2 border-base-300 transition-all duration-300 hover:border-base-content/20 hover:-translate-y-1" style="isolation: isolate;">
			<!-- Banner -->
			<div class="absolute inset-x-0 top-0 h-28 rounded-t-2xl overflow-hidden" style="background: {palette.light};">
				<!-- Base color fading left to right -->
				<div
					class="absolute inset-0"
					style="background: linear-gradient(to right, {palette.base}, {palette.base} 40%, {palette.dark}bb);"
				></div>

				<!-- Pattern layer with left-to-right opacity mask -->
				<div
					class="absolute inset-0"
					style="
						mask-image: linear-gradient(to right, transparent 5%, black 60%);
						-webkit-mask-image: linear-gradient(to right, transparent 5%, black 60%);
					"
				>
					{#if patternVariant === 0}
						<div
							class="absolute inset-[-50%] w-[200%] h-[200%]"
							style="background: repeating-linear-gradient(
								{patternAngle}deg,
								transparent,
								transparent 10px,
								{palette.dark} 10px,
								{palette.dark} 13px,
								transparent 13px,
								transparent 26px,
								{palette.light}40 26px,
								{palette.light}40 28px
							);"
						></div>
					{:else if patternVariant === 1}
						<div
							class="absolute inset-0"
							style="background:
								radial-gradient(circle at 20% 50%, {palette.dark}66 0, {palette.dark}66 30px, transparent 30px),
								radial-gradient(circle at 80% 30%, {palette.light}44 0, {palette.light}44 45px, transparent 45px),
								radial-gradient(circle at 60% 80%, {palette.dark}55 0, {palette.dark}55 22px, transparent 22px),
								radial-gradient(circle at 10% 10%, {palette.light}33 0, {palette.light}33 50px, transparent 50px);
							"
						></div>
					{:else}
						<div class="absolute inset-0">
							<div
								class="absolute inset-0"
								style="background:
									linear-gradient({patternAngle}deg, {palette.dark}88 0%, transparent 40%),
									linear-gradient({patternAngle + 90}deg, {palette.light}44 0%, transparent 50%);
								"
							></div>
							<div
								class="absolute inset-0"
								style="background-image: repeating-linear-gradient(
									0deg,
									transparent,
									transparent 8px,
									{palette.dark}22 8px,
									{palette.dark}22 9px
								);"
							></div>
						</div>
					{/if}

					<!-- Dot grid texture -->
					<div
						class="absolute inset-0"
						style="background-image: radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 16px 16px;"
					></div>
				</div>

				<!-- Chips in banner -->
				<div class="absolute top-2.5 right-3 flex items-center gap-1.5 pointer-events-none">
					<span class="text-[0.65rem] font-mono font-medium rounded-full px-2 py-0.5" style="background: rgba(0,0,0,0.25); color: rgba(255,255,255,0.95);">
						{classItem.code}
					</span>
					{#if classItem.semester?.name}
						<span class="text-[0.65rem] font-medium rounded-full px-2 py-0.5" style="background: rgba(0,0,0,0.2); color: rgba(255,255,255,0.9);">
							{classItem.semester.name}
						</span>
					{/if}
				</div>

				<!-- Class name -->
				<div class="absolute inset-x-0 bottom-0 px-5 pb-3 pointer-events-none">
						<h2
							class="font-bold text-[1.25rem] leading-snug text-white truncate"
							title={classItem.name}
							style="text-shadow: 0 1px 6px {palette.dark}cc, 0 0 24px {palette.dark}aa;"
						>
						{classItem.name}
					</h2>
				</div>
			</div>

			<!-- Content -->
			<div class="absolute inset-x-0 bottom-0 top-28 px-5 pt-4 pb-3.5 flex flex-col">
				<p class="text-sm text-base-content/55 text-left line-clamp-3 leading-relaxed">
					{classItem.description || 'No description available'}
				</p>

				<div class="mt-auto flex justify-end pt-3">
					<div class="btn btn-sm btn-primary btn-soft rounded-full gap-1.5 transition-all duration-200 group-hover:gap-2.5">
						Study <ArrowRight size={14} class="transition-transform duration-200 group-hover:translate-x-0.5" />
					</div>
				</div>
			</div>
		</div>
	</button>
</div>
