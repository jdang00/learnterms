<script lang="ts">
	let { isOpen, onCancel, onConfirm, itemName } = $props<{
		isOpen: boolean;
		onCancel: () => void;
		onConfirm: (count: number) => void;
		itemName?: string;
	}>();

	import { X } from 'lucide-svelte';

	let count = $state(1);
	function dec() {
		if (count > 1) count = count - 1;
	}
	function inc() {
		if (count < 10) count = count + 1;
	}
	function submit() {
		onConfirm(count);
	}
</script>

<dialog class="modal max-w-full p-4" class:modal-open={isOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onclick={onCancel}>
				<X size={16} />
			</button>
		</form>
		<h3 class="text-lg font-bold">Duplicate Question</h3>
		<p class="py-2 text-base-content/70">
			How many copies {itemName ? `of "${itemName}"` : ''} would you like to create?
		</p>
		<div class="alert alert-warning mb-3">
			<span>Note: media attached to the question is not copied.</span>
		</div>
		<div class="form-control">
			<label class="label" for="duplicate-count">
				<span class="label-text">Number of copies (1-10)</span>
			</label>
			<div class="join w-full">
				<button type="button" class="btn join-item" onclick={dec}>-</button>
				<input
					type="number"
					min={1}
					max={10}
					class="input input-bordered join-item w-24 text-center"
					id="duplicate-count"
					value={count}
					oninput={(e) => {
						const v = parseInt((e.target as HTMLInputElement).value);
						if (!Number.isNaN(v)) count = Math.max(1, Math.min(10, v));
					}}
				/>
				<button type="button" class="btn join-item" onclick={inc}>+</button>
			</div>
		</div>
		<div class="flex justify-end space-x-2 mt-4">
			<button class="btn btn-outline" onclick={onCancel}>Cancel</button>
			<button class="btn btn-primary" onclick={submit}>Duplicate</button>
		</div>
	</div>
</dialog>
