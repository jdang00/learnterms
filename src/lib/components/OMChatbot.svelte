<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { onMount, afterUpdate } from 'svelte';

	export let scheduleData: any[] = [];
	export let isOpen = false;
	export let onToggle: ((isOpen: boolean) => void) | undefined = undefined;
	
	let messagesContainer: HTMLDivElement;
	let shouldAutoScroll = true;
	
	// Initialize the chat with OM information using the Chat class
	const chat = new Chat({
		api: '/api/chat',
		body: {
			get scheduleData() {
				return scheduleData;
			}
		},
		initialMessages: [
			{
				id: '1',
				role: 'assistant',
				content: "Hi! I'm here to help you with everything about Optometry's Meeting 2025! 👓✨\n\nI can help you:\n• Find specific events and sessions\n• Check event requirements and timing\n• Get information about speakers and topics\n• Navigate the schedule\n• Answer questions about the meeting\n\nWhat would you like to know about OM 2025?"
			}
		]
	});

	function toggleChat() {
		isOpen = !isOpen;
		onToggle?.(isOpen);
	}

	function formatMessage(content: string) {
		// Simple markdown-like formatting
		return content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/\n/g, '<br>');
	}

	function scrollToBottom() {
		if (messagesContainer && shouldAutoScroll) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function handleScroll() {
		if (messagesContainer) {
			const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
			// Check if user is near the bottom (within 50px)
			shouldAutoScroll = scrollTop + clientHeight >= scrollHeight - 50;
		}
	}

	// Auto-scroll when messages change or during streaming
	afterUpdate(() => {
		scrollToBottom();
	});

	// Scroll to bottom when chat opens
	$: if (isOpen) {
		setTimeout(scrollToBottom, 100);
	}
</script>

<!-- Chat Toggle Button -->
<div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
	{#if !isOpen}
		<button
			class="btn btn-primary btn-circle btn-lg shadow-lg hover:shadow-xl transition-all duration-200"
			onclick={toggleChat}
			aria-label="Open OM Assistant"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
			</svg>
		</button>
	{/if}
</div>

<!-- Chat Window -->
{#if isOpen}
	<div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-80 sm:w-96 h-[28rem] sm:h-[32rem] bg-base-100 rounded-2xl shadow-2xl border border-base-200 flex flex-col">
		<!-- Header -->
		<div class="bg-primary text-primary-content rounded-t-2xl p-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				
				<div>
					<h3 class="font-bold text-sm">LearnTerms Assistant</h3>
					<p class="text-xs opacity-90">Optometry's Meeting 2025</p>
				</div>
			</div>
			<button
				class="btn btn-sm btn-ghost btn-circle text-primary-content"
				onclick={toggleChat}
				aria-label="Close chat"
			>
				✕
			</button>
		</div>

		<!-- Messages -->
		<div 
			bind:this={messagesContainer}
			class="flex-1 overflow-y-auto p-4 space-y-3 bg-base-50 scroll-smooth"
			onscroll={handleScroll}
		>
			{#each chat.messages as message (message.id)}
				<div class="chat chat-{message.role === 'user' ? 'end' : 'start'}">
					<div class="chat-bubble {message.role === 'user' ? 'chat-bubble-primary' : ''} text-sm">
						{#each message.parts as part}
							{#if part.type === 'text'}
								{@html formatMessage(part.text)}
							{/if}
						{/each}
					</div>
				</div>
			{/each}
			
			{#if chat.status === 'streaming' || chat.status === 'submitted'}
				<div class="chat chat-start">
					<div class="chat-bubble">
						<div class="flex items-center gap-1">
							<span class="loading loading-dots loading-sm"></span>
							<span class="text-xs">Thinking...</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input -->
		<form onsubmit={chat.handleSubmit} class="p-4 border-t border-base-200">
			<div class="flex gap-2">
				<input
					bind:value={chat.input}
					placeholder="Ask me about OM 2025..."
					class="input input-bordered input-sm flex-1 text-sm"
					disabled={chat.status !== 'ready'}
				/>
				<button
					type="submit"
					class="btn btn-primary btn-sm btn-circle"
					disabled={chat.status !== 'ready' || !chat.input.trim()}
					aria-label="Send message"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
					</svg>
				</button>
			</div>
		</form>
	</div>
{/if}

<style>
	.bg-base-50 {
		background-color: hsl(var(--b1) / 0.5);
	}
</style> 