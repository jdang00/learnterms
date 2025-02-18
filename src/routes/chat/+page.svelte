<script lang="ts">
	import { useChat } from '@ai-sdk/svelte';
	import { Send } from 'lucide-svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	// Destructure the stores and functions from the Vercel AI SDK
	const { input, handleSubmit, messages } = useChat();

	/**
	 * Converts Markdown content to sanitized HTML.
	 * Uses marked with synchronous operation and proper typing.
	 */
	function formatMarkdown(content: string): string {
		// Force marked to return a string synchronously
		const html = marked.parse(content, { async: false }) as string;
		// Explicitly type the sanitized output as string
		const sanitized = DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [
				'p',
				'strong',
				'em',
				'code',
				'pre',
				'blockquote',
				'ul',
				'ol',
				'li',
				'a',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6'
			],
			ALLOWED_ATTR: ['href']
		});
		return sanitized;
	}
</script>

<main class="relative flex flex-col h-screen pt-16">
	<!-- Chat History -->
	<div class="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
		<div class="max-w-4xl mx-auto w-full">
			{#each $messages as message (message.id)}
				<div class="chat {message.role === 'user' ? 'chat-end' : 'chat-start'}">
					<div class="chat-bubble {message.role === 'assistant' ? 'chat-bubble-primary' : ''}">
						{@html formatMarkdown(message.content)}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Chat Input (fixed to the bottom) -->
	<div class="fixed bottom-0 left-0 right-0 bg-base-100 p-4">
		<div class="max-w-4xl mx-auto w-full">
			<form on:submit|preventDefault={handleSubmit} class="flex gap-2 px-4">
				<input
					type="text"
					bind:value={$input}
					placeholder="Type your message..."
					class="input input-bordered flex-1 rounded-full min-w-0"
				/>
				<button type="submit" class="btn btn-primary rounded-full">
					<Send class="w-4 h-4" />
				</button>
			</form>
		</div>
	</div>
</main>
