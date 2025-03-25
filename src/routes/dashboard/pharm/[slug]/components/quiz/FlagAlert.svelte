<script>
	let { qm } = $props();
</script>

{#if qm.fm.noFlags}
	<!-- Alert Box (Responsive & Centered) -->
	<div
		role="alert"
		class="alert alert-warning fixed top-4 sm:top-6 md:top-8 left-1/2 transform -translate-x-1/2 z-50 w-11/12 sm:w-max max-w-xs sm:max-w-sm md:max-w-md p-4 text-center animate-fade"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-6 w-6 shrink-0 stroke-current inline-block align-middle mr-2"
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
			/>
		</svg>
		<span class="align-middle">No Questions Flagged.</span>
		<button
			class="btn btn-sm btn-ghost btn-warning"
			onclick={() => {
				qm.fm.noFlags = false;
			}}>X</button
		>
	</div>
{/if}

<style>
	.animate-fade {
		animation: fadeInOut 0.5s forwards;
	}
</style>
