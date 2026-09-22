<script lang="ts">
	import { getQuizCommands } from './commands.svelte';
	import { matchShortcut, optionIndexForKey, shouldIgnoreShortcut } from './shortcuts';

	let { disabled = false }: { disabled?: boolean } = $props();

	const registry = getQuizCommands();

	function handleKeydown(event: KeyboardEvent) {
		if (!registry || disabled) return;

		const binding = matchShortcut(event);
		if (shouldIgnoreShortcut(event, binding)) return;

		if (binding) {
			const command = registry.get(binding.command);
			if (!command) return;
			event.preventDefault();
			if (command.enabled?.() !== false) void command.run('keyboard');
			return;
		}

		const optionIndex = optionIndexForKey(event.key);
		if (optionIndex !== null && registry.toggleOptionAt(optionIndex)) {
			event.preventDefault();
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />
