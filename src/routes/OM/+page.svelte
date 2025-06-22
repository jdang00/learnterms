<script lang="ts">
	import { OMScheduleLogic } from './schedule.svelte';
	import OMChatbot from '$lib/components/OMChatbot.svelte';

	// Initialize the schedule logic
	const scheduleLogic = new OMScheduleLogic();
	
	// Set default filter to required events for mobile-first experience
	scheduleLogic.setRequirementFilter('required');

	// Chatbot state
	let chatbotOpen = false;

	// Modal state for room information
	let selectedRoom = '';
	let selectedEvent = '';

	// Function to open room modal
	function openRoomModal(room: string, event: string) {
		selectedRoom = room;
		selectedEvent = event;
		const modal = document.getElementById('room_modal') as HTMLDialogElement;
		modal?.showModal();
	}

	// Function to get room image based on room name
	function getRoomImage(room: string): string {
		const roomLower = room.toLowerCase();
		if (roomLower.includes('ballroom ab')) {
			return '/src/routes/OM/images/BallroomAB.png';
		} else if (roomLower.includes('exhibit hall')) {
			return '/src/routes/OM/images/Exhbit Halls.png';
		} else if (roomLower.includes('auditorium')) {
			return '/src/routes/OM/images/Auditorium.png';
		}
		return ''; // No image available
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
	<!-- Mobile-Optimized Header -->
	<div class="bg-primary text-primary-content">
		<div class="max-w-7xl mx-auto px-4 py-4 md:py-6 text-center">
			<h1 class="text-2xl md:text-4xl lg:text-6xl font-bold mb-3 md:mb-4">👓 OM 2025</h1>

			<!-- Mobile: Compact Stats -->
			<div class="md:hidden grid grid-cols-2 gap-2 bg-base-100 text-primary rounded-lg p-3 shadow-lg">
				<div class="text-center">
					<div class="text-lg font-bold text-success">{scheduleLogic.requiredCount}</div>
					<div class="text-xs">Required</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-bold">{scheduleLogic.filteredSchedule.length}</div>
					<div class="text-xs">Showing</div>
				</div>
			</div>

			<!-- Desktop: Full Stats -->
			<div class="hidden md:block">
				<div class="stats stats-vertical lg:stats-horizontal bg-base-100 text-primary shadow-lg mt-6">
					<div class="stat">
						<div class="stat-title">Total Events</div>
						<div class="stat-value text-xl md:text-2xl">{scheduleLogic.filteredSchedule.length}</div>
						<div class="stat-desc">Available to view</div>
					</div>
					<div class="stat">
						<div class="stat-title">Required Events</div>
						<div class="stat-value text-xl md:text-2xl text-success">
							{scheduleLogic.requiredCount}
						</div>
						<div class="stat-desc">Must attend</div>
					</div>
					<div class="stat">
						<div class="stat-title">Days</div>
						<div class="stat-value text-xl md:text-2xl">{scheduleLogic.uniqueDays.length}</div>
						<div class="stat-desc">Event days</div>
					</div>
					<div class="stat">
						<div class="stat-title">Active Filters</div>
						<div class="stat-value text-xl md:text-2xl text-warning">
							{scheduleLogic.activeFiltersCount}
						</div>
						<div class="stat-desc">Currently applied</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- AI Assistant Notice -->
	<div class=" text-info-content">
		<div class="max-w-7xl mx-auto px-4 py-2 md:py-4">
			<!-- Mobile: Compact -->
			<div class="md:hidden flex items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<div class="text-lg">🤖</div>
					<div>
						<h3 class="font-bold text-base-content text-sm">Need Help?</h3>
					</div>
				</div>
				<button
					class="btn btn-outline btn-xs text-base-content border-info-content hover:bg-info-content hover:text-info"
					onclick={() => (chatbotOpen = true)}
				>
					💬 Assistant
				</button>
			</div>

			<!-- Desktop: Full -->
			<div class="hidden md:flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="text-2xl">🤖</div>
					<div>
						<h3 class="font-bold text-base-content text-lg">Need Help Finding Something?</h3>
						<p class="text-sm text-base-content opacity-90">
							Ask our OM Assistant about events, requirements, locations, and more!
						</p>
					</div>
				</div>
				<button
					class="btn btn-outline text-base-content  gap-2"
					onclick={() => (chatbotOpen = true)}
				>
					💬 Open Assistant
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						></path>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-4 py-4 md:py-8">
		<!-- Mobile-First Quick Filters -->
		<div class="card bg-base-100 shadow-lg mb-4 md:mb-8">
			<div class="card-body p-3 md:p-6">
				<!-- Mobile Quick Filter Buttons -->
				<div class="flex flex-wrap gap-3 mb-6">
					<button
						class="btn btn-sm md:btn-sm flex-1 min-w-0"
						class:btn-success={scheduleLogic.filters.requirementFilter === 'required'}
						class:btn-outline={scheduleLogic.filters.requirementFilter !== 'required'}
						onclick={() => scheduleLogic.setRequirementFilter('required')}
					>
						✅ Required 
					</button>
					<button
						class="btn btn-sm md:btn-sm flex-1 min-w-0"
						class:btn-primary={scheduleLogic.filters.requirementFilter === 'all'}
						class:btn-outline={scheduleLogic.filters.requirementFilter !== 'all'}
						onclick={() => scheduleLogic.setRequirementFilter('all')}
					>
						All Events
					</button>
					<button
						class="btn btn-sm md:btn-sm flex-1 min-w-0"
						class:btn-ghost={scheduleLogic.filters.requirementFilter === 'optional'}
						class:btn-outline={scheduleLogic.filters.requirementFilter !== 'optional'}
						onclick={() => scheduleLogic.setRequirementFilter('optional')}
					>
						Optional
					</button>
				</div>

				<!-- Search Bar -->
				<div class="form-control mb-5 md:mb-4">
					<div class="input-group">
						<input
							type="text"
							placeholder="Quick search..."
							class="input input-bordered input-md flex-1"
							bind:value={scheduleLogic.searchTerm}
						/>
						{#if scheduleLogic.searchTerm}
							<button
								class="btn btn-square btn-outline btn-md"
								onclick={() => scheduleLogic.clearSearch()}
							>
								✕
							</button>
						{/if}
					</div>
				</div>

				<!-- Collapsible Advanced Filters -->
				<details class="md:hidden">
					<summary class="btn btn-md btn-ghost w-full justify-between">
						Advanced Filters
						{#if scheduleLogic.activeFiltersCount > 1}
							<div class="badge badge-info">{scheduleLogic.activeFiltersCount}</div>
						{/if}
					</summary>
					<div class="pt-5 space-y-5">
						<!-- Day Filter -->
						<div>
							<h4 class="text-base font-semibold mb-3">📅 Days</h4>
							<div class="flex flex-wrap gap-2">
								{#each scheduleLogic.uniqueDays as day (day)}
									<button
										class="btn btn-sm"
										class:btn-primary={scheduleLogic.filters.selectedDays.has(day)}
										class:btn-outline={!scheduleLogic.filters.selectedDays.has(day)}
										onclick={() => scheduleLogic.toggleDayFilter(day)}
									>
										{day.split(',')[0]}
									</button>
								{/each}
							</div>
						</div>

						<!-- Category Filter -->
						<div>
							<h4 class="text-base font-semibold mb-3">🏷️ Categories</h4>
							<div class="flex flex-wrap gap-2">
								{#each scheduleLogic.uniqueCategories as category (category)}
									<button
										class="btn btn-sm"
										class:btn-active={scheduleLogic.filters.selectedCategories.has(category)}
										class:btn-outline={!scheduleLogic.filters.selectedCategories.has(category)}
										onclick={() => scheduleLogic.toggleCategoryFilter(category)}
									>
										{scheduleLogic.getCategoryDisplayName(category).split(' ')[0]}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</details>

				<!-- Desktop Filters (Hidden on Mobile) -->
				<div class="hidden md:block space-y-6">
					<!-- Day Filter Section -->
					<div>
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							📅 Select Days
							{#if scheduleLogic.filters.selectedDays.size > 0}
								<div class="badge badge-info">{scheduleLogic.filters.selectedDays.size} selected</div>
							{/if}
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each scheduleLogic.uniqueDays as day (day)}
								<button
									class="btn btn-sm"
									class:btn-primary={scheduleLogic.filters.selectedDays.has(day)}
									class:btn-outline={!scheduleLogic.filters.selectedDays.has(day)}
									onclick={() => scheduleLogic.toggleDayFilter(day)}
								>
									{day}
									{#if scheduleLogic.filters.selectedDays.has(day)}
										<span class="ml-1">✓</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<!-- Category Filter Section -->
					<div>
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							🏷️ Filter by Category
							{#if scheduleLogic.filters.selectedCategories.size > 0}
								<div class="badge badge-info">
									{scheduleLogic.filters.selectedCategories.size} selected
								</div>
							{/if}
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each scheduleLogic.uniqueCategories as category (category)}
								<button
									class="btn btn-sm gap-1"
									class:btn-active={scheduleLogic.filters.selectedCategories.has(category)}
									class:btn-outline={!scheduleLogic.filters.selectedCategories.has(category)}
									onclick={() => scheduleLogic.toggleCategoryFilter(category)}
								>
									{scheduleLogic.getCategoryDisplayName(category)}
									{#if scheduleLogic.filters.selectedCategories.has(category)}
										<span class="ml-1">✓</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Control Bar -->
				<div class="flex justify-between items-center gap-3 pt-4 md:pt-4 border-t border-base-200">
					<div class="text-sm md:text-sm text-base-content/70">
						{scheduleLogic.filteredSchedule.length} events
					</div>
					{#if scheduleLogic.activeFiltersCount > 0}
						<button
							class="btn btn-sm md:btn-sm"
							onclick={() => scheduleLogic.clearAllFilters()}
						>
							Clear ({scheduleLogic.activeFiltersCount})
						</button>
					{/if}
					<div class="btn-group">
						<button
							class="btn btn-sm md:btn-sm"
							class:btn-active={scheduleLogic.viewMode === 'cards'}
							onclick={() => scheduleLogic.setViewMode('cards')}
						>
							📱
						</button>
						<button
							class="btn btn-sm md:btn-sm hidden md:inline-flex"
							class:btn-active={scheduleLogic.viewMode === 'table'}
							onclick={() => scheduleLogic.setViewMode('table')}
						>
							📊
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Results -->
		{#if scheduleLogic.filteredSchedule.length === 0}
			<div class="text-center py-16">
				<div class="text-6xl mb-4">🤷‍♀️</div>
				<h3 class="text-2xl font-bold mb-2">No events found</h3>
				<p class="text-base-content/70 mb-4">Try adjusting your search or filter criteria</p>
				<button class="btn btn-primary" onclick={() => scheduleLogic.clearAllFilters()}>
					Clear All Filters
				</button>
			</div>
		{:else if scheduleLogic.viewMode === 'cards'}
			<!-- Mobile-Optimized Card View -->
			<div class="space-y-4 md:space-y-4">
				{#each scheduleLogic.filteredSchedule as item (item.day + item.event + item.time)}
					<div
						class="card bg-base-100 shadow-md border-l-4 transition-shadow duration-200"
						class:border-l-success={item.required}
						class:border-l-base-300={!item.required}
					>
						<div class="card-body p-4 md:p-4">
							<!-- Mobile Layout: Stacked -->
							<div class="md:hidden">
								<!-- Header Row -->
								<div class="flex justify-between items-start mb-4">
									<div class="flex-1 min-w-0 pr-3">
										<h3 class="font-bold text-lg leading-relaxed mb-2 line-clamp-2">
											{item.event}
										</h3>
										<div class="text-sm text-primary font-medium">
											{item.day.split(',')[0]} • {item.time}
										</div>
									</div>
									<div class="flex-shrink-0">
										{#if item.required}
											<div class="badge badge-success">✅</div>
										{:else}
											<div class="badge badge-ghost">📝</div>
										{/if}
									</div>
								</div>

								<!-- Notes - Truncated for Mobile -->
								{#if item.notes}
									<p class="text-sm text-base-content/70 line-clamp-2 mb-4 leading-relaxed">
										{item.notes}
									</p>
								{/if}

								<!-- Action Buttons -->
								<div class="flex gap-3">
									{#if item.location}
										<a
											href={item.location}
											target="_blank"
											rel="noopener noreferrer"
											class="btn btn-sm btn-outline btn-primary flex-1"
										>
											📍 Map
										</a>
									{/if}
									{#if item.room}
										<button
											class="btn btn-sm btn-outline btn-primary flex-1"
											onclick={() => openRoomModal(item.room!, item.event)}
										>
											🏠 Room
										</button>
									{/if}
								</div>
							</div>

							<!-- Desktop Layout: Side by Side -->
							<div class="hidden md:flex md:items-start gap-4">
								<!-- Time and Day Info -->
								<div class="w-48 flex-shrink-0">
									<div class="text-sm font-medium text-primary mb-1">
										{item.day}
									</div>
									<div class="text-lg font-bold mb-2">{item.time}</div>
									<div class="flex flex-wrap gap-2">
										{#if item.required}
											<div class="badge badge-success">✅ Required</div>
										{:else}
											<div class="badge badge-ghost">Optional</div>
										{/if}
										<div class="badge badge-ghost">
											{scheduleLogic.getCategoryDisplayName(item.category)}
										</div>
									</div>
								</div>

								<!-- Event Details -->
								<div class="flex-1">
									<h3 class="card-title text-lg mb-2">
										{item.event}
									</h3>
									{#if item.notes}
										<p class="text-base-content/80 text-sm leading-relaxed mb-3">
											{item.notes}
										</p>
									{/if}
									<div class="flex gap-2">
										{#if item.location}
											<a
												href={item.location}
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-sm btn-outline btn-primary gap-2"
											>
												📍 View Location
											</a>
										{/if}
										{#if item.room}
											<button
												class="btn btn-sm btn-outline btn-primary gap-2"
												onclick={() => openRoomModal(item.room!, item.event)}
											>
												🏠 View Room
											</button>
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Table View - Desktop Only -->
			<div class="hidden md:block card bg-base-100 shadow-xl overflow-hidden">
				<div class="overflow-x-auto">
					<table class="table table-zebra w-full">
						<thead class="bg-base-200">
							<tr>
								<th class="w-1/6">📅 Day & Time</th>
								<th class="w-2/6">🎉 Event</th>
								<th class="w-2/6">📝 Notes</th>
								<th class="w-1/6 text-center">📍 Location</th>
								<th class="w-1/6 text-center">🏠 Room/Floor</th>
								<th class="w-1/6 text-center">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each scheduleLogic.filteredSchedule as item (item.day + item.event + item.time)}
								<tr class="hover">
									<td class="font-medium">
										<div class="text-sm text-primary mb-1">
											{item.day}
										</div>
										<div class="font-bold">{item.time}</div>
									</td>
									<td>
										<div class="font-semibold mb-1">{item.event}</div>
										<div class="badge badge-ghost badge-sm">
											{scheduleLogic.getCategoryDisplayName(item.category)}
										</div>
									</td>
									<td class="text-sm text-base-content/70 max-w-xs">
										{item.notes || ''}
									</td>
									<td class="text-center">
										{#if item.location}
											<a
												href={item.location}
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-xs btn-outline btn-primary"
											>
												📍 Map
											</a>
										{:else}
											<span class="text-xs text-base-content/50">—</span>
										{/if}
									</td>
									<td class="text-center">
										{#if item.room}
											<button
												class="btn btn-xs btn-outline btn-primary"
												onclick={() => openRoomModal(item.room!, item.event)}
											>
												🏠 Room
											</button>
										{:else}
											<span class="text-xs text-base-content/50">—</span>
										{/if}
									</td>
									<td class="text-center">
										{#if item.required}
											<div class="badge badge-success">
												✅ <span class="text-xs hidden md:block">Required</span>
											</div>
										{:else}
											<div class="badge badge-ghost">Optional</div>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<footer class="bg-base-300 text-center py-6 md:py-8 mt-8 md:mt-16">
		<div class="max-w-4xl mx-auto px-4">
			<!-- Mobile: Simplified -->
			<div class="md:hidden">
				<p class="text-sm font-semibold mb-2">
					🎯 Use filters to find what you need!
				</p>
				<p class="text-xs text-base-content/70">Built with ❤️ by your AOSA Trustee-Elect</p>
			</div>

			<!-- Desktop: Full -->
			<div class="hidden md:block">
				<p class="text-lg font-semibold mb-2">
					🎯 Pro Tip: Use multiple filters to find exactly what you need - like "Required" +
					"Wednesday" for required events on Wednesday!
				</p>
				<p class="text-sm text-base-content/70 mb-4">Built with ❤️ by your AOSA Trustee-Elect</p>
				<p class="text-xs text-base-content/60">
					Questions about events or requirements? Use the OM Assistant above! 🤖💬
				</p>
			</div>
		</div>
	</footer>
</div>

<!-- OM Chatbot -->
<OMChatbot
	scheduleData={scheduleLogic.schedule}
	bind:isOpen={chatbotOpen}
	onToggle={(isOpen) => (chatbotOpen = isOpen)}
/>

<!-- Room Information Modal -->
<dialog id="room_modal" class="modal">
	<div class="modal-box max-w-7xl w-11/12 max-h-[90vh]">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
		</form>
		<h3 class="text-xl font-bold mb-6">🏠 {selectedRoom}</h3>
		
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Room Layout -->
			{#if getRoomImage(selectedRoom)}
				<div>
					<h4 class="font-semibold text-primary mb-4 text-lg">Room</h4>
					<div class="bg-base-200 p-4 rounded-lg">
						<img 
							src={getRoomImage(selectedRoom)} 
							alt="Room layout for {selectedRoom}"
							class="w-full h-auto rounded-lg shadow-md max-h-96 object-contain"
						/>
					</div>
				</div>
			{/if}

			<!-- Floor Plan -->
			<div>
				<h4 class="font-semibold text-primary mb-4 text-lg">Convention Center Floor</h4>
				<div class="bg-base-200 p-4 rounded-lg">
					<img 
						src="/src/routes/OM/images/Floor One.png" 
						alt="Floor 1 layout"
						class="w-full h-auto rounded-lg shadow-md max-h-96 object-contain"
					/>
				</div>
			</div>
		</div>
	</div>
</dialog>

<style>
	/* Line clamp utility for mobile text truncation */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
