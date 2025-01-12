<script lang="ts">
	import showdown from 'showdown';
	import type { ChatMessage } from '$lib/types';

	let messages = $state<ChatMessage[]>([]);
	let loading = $state<boolean>(false);
	let input = $state<string>('');
	let converter = new showdown.Converter();

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!input.trim()) return;

		const userMessage: ChatMessage = { role: 'user', content: input };
		messages = [...messages, userMessage];
		input = '';
		loading = true;

		try {
			const response = await fetch('/chat/api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages })
			});

			const data = await response.json();

			const assistantMessage: ChatMessage = {
				role: 'assistant',
				content: data.message
			};

			messages = [...messages, assistantMessage];
		} catch (error) {
			console.error('Error:', error);
		} finally {
			loading = false;
		}
	}

	function getCompiledHtml(message: ChatMessage): string {
		if (message.role === 'assistant') {
			console.log(converter.makeHtml(message.content));
			return converter.makeHtml(message.content);
		}

		return message.content;
	}
</script>

<div class="bg-base-200 flex flex-col h-screen">
	<main class="flex flex-col flex-1 container mx-auto p-4 overflow-hidden">
		<div class="flex-1 overflow-y-auto mb-4 space-y-4">
			{#each messages as message}
				<div class="chat {message.role === 'user' ? 'chat-end' : 'chat-start'}">
					{#if message.role === 'user'}
						<div class="chat-bubble chat-bubble-primary">
							{message.content}
						</div>
					{/if}

					{#if message.role === 'assistant'}
						<div class="chat-bubble">
							{@html getCompiledHtml(message)}
						</div>
					{/if}
				</div>
			{/each}
			{#if loading}
				<div class="flex justify-center">
					<span class="loading loading-dots loading-lg"></span>
				</div>
			{/if}
		</div>
	</main>

	<div class="fixed bottom-0 left-0 w-full bg-base-200 p-4">
		<form class="flex gap-2 container mx-auto" onsubmit={handleSubmit}>
			<input
				type="text"
				bind:value={input}
				placeholder="Type your message..."
				class="input input-bordered flex-1"
				disabled={loading}
			/>
			<button type="submit" class="btn btn-primary" disabled={loading || !input.trim()}>
				Send
			</button>
		</form>
	</div>
</div>
