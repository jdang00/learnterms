<script lang="ts">
	let {
		isOpen,
		onCancel,
		onConfirm,
		itemName
	}: {
		isOpen: boolean;
		onCancel: () => void;
		onConfirm: (count: number) => void;
		itemName?: string;
	} = $props();

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import * as Alert from '$lib/components/ui/alert';

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

<Dialog.Root
	open={isOpen}
	onOpenChange={(o) => {
		if (!o) onCancel();
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Duplicate Question</Dialog.Title>
		</Dialog.Header>
		<p class="py-2 text-foreground/70">
			How many copies {itemName ? `of "${itemName}"` : ''} would you like to create?
		</p>
		<Alert.Root tone="warning">
			<Alert.Description>Note: media attached to the question is not copied.</Alert.Description>
		</Alert.Root>
		<Field.Field>
			<Field.Label for="duplicate-count">Number of copies (1-10)</Field.Label>
			<div class="flex w-full gap-2">
				<Button variant="soft" tone="neutral" onclick={dec}>-</Button>
				<Input
					type="number"
					min={1}
					max={10}
					class="w-24 text-center"
					id="duplicate-count"
					value={count}
					oninput={(e) => {
						const v = parseInt((e.target as HTMLInputElement).value);
						if (!Number.isNaN(v)) count = Math.max(1, Math.min(10, v));
					}}
				/>
				<Button variant="soft" tone="neutral" onclick={inc}>+</Button>
			</div>
		</Field.Field>
		<Dialog.Footer>
			<Button variant="outline" tone="neutral" onclick={onCancel}>Cancel</Button>
			<Button onclick={submit}>Duplicate</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
