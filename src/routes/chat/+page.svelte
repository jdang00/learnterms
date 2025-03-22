<script lang="ts">
	import { fade } from 'svelte/transition';
	import { useChat } from '@ai-sdk/svelte';
	import { Send } from 'lucide-svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	// Destructure the reactive stores and functions from the AI SDK
	const { input, handleSubmit, messages } = useChat();

	/**
	 * Converts Markdown content to sanitized HTML.
	 */
	function formatMarkdown(content: string): string {
		// Convert Markdown to raw HTML
		const rawHtml = marked.parse(content, { async: false });
		// Sanitize to avoid XSS
		return DOMPurify.sanitize(rawHtml);
	}

	function scrollToBottom() {
		const chatHistory = document.querySelector('.overflow-y-auto');
		if (chatHistory) {
			chatHistory.scrollTop = chatHistory.scrollHeight;
		}
	}

	// Side effect: scroll to bottom when messages change
	$effect(() => {
		if ($messages.length > 0) {
			setTimeout(scrollToBottom, 0);
		}
	});

	// Side effect: also scroll to bottom on mount
	$effect(() => {
		scrollToBottom();
	});
</script>

<main class="relative flex flex-col h-screen pt-16">
	<!-- Chat History -->
	<div class="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
		<div class="max-w-4xl mx-auto w-full">
			{#each $messages as message (message.id)}
				{#if message.role === 'user'}
					<!-- User messages -->
					<div class="chat chat-end">
						<div class="chat-bubble bg-primary text-primary-content">
							{@html formatMarkdown(message.content)}
						</div>
					</div>
				{:else if message.role === 'assistant'}
					<!-- Assistant messages with Markdown + fade transition -->
					<div
						transition:fade
						class="card bg-base-100 shadow-sm p-4 rounded-lg prose max-w-none my-8"
					>
						{@html formatMarkdown(message.content)}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Chat Input (fixed to the bottom) -->
	<div class="fixed bottom-0 left-0 right-0 bg-base-200 p-4">
		<div class="max-w-4xl mx-auto w-full">
			<!-- Svelte automatically prevents the default form submission -->
			<form onsubmit={handleSubmit} class="flex gap-2 px-4">
				<input
					type="text"
					bind:value={$input}
					placeholder="Type your message..."
					class="input input-bordered flex-1 rounded-full"
				/>
				<button type="submit" class="btn btn-primary rounded-full">
					<Send class="w-4 h-4" />
				</button>
			</form>
		</div>
	</div>
</main>
