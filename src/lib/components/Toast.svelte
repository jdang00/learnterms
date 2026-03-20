<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-svelte';
</script>

{#if toastStore.toasts.length > 0}
	<div class="toast toast-end toast-bottom z-[9999] p-4 gap-3">
		{#each toastStore.toasts as toast (toast.id)}
			<div
				class="alert shadow-lg flex items-start gap-3 p-4 min-w-[300px] animate-slide-in border-l-4 rounded-lg bg-base-100
					{toast.type === 'success' ? 'border-l-success text-success-content' : ''}
					{toast.type === 'error' ? 'border-l-error text-error-content' : ''}
					{toast.type === 'info' ? 'border-l-info text-info-content' : ''}
					{toast.type === 'warning' ? 'border-l-warning text-warning-content' : ''}"
			>
				<div class="mt-0.5">
					{#if toast.type === 'success'}
						<CheckCircle size={20} class="text-success" />
					{:else if toast.type === 'error'}
						<AlertCircle size={20} class="text-error" />
					{:else if toast.type === 'warning'}
						<AlertTriangle size={20} class="text-warning" />
					{:else}
						<Info size={20} class="text-info" />
					{/if}
				</div>
				<div class="flex-1 text-sm font-medium text-base-content/90 pt-0.5">
					{toast.message}
				</div>
				<button 
					class="btn btn-ghost btn-xs btn-circle -mr-1 -mt-1 opacity-50 hover:opacity-100" 
					onclick={() => toastStore.remove(toast.id)}
				>
					<X size={16} />
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(1rem);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	:global(.animate-slide-in) {
		animation: slide-in 0.2s ease-out;
	}
</style>
