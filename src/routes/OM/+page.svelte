<script lang="ts">
	import { OMScheduleLogic } from './schedule.svelte';
	import OMChatbot from '$lib/components/OMChatbot.svelte';

	// Initialize the schedule logic
	const scheduleLogic = new OMScheduleLogic();

	// Chatbot state
	let chatbotOpen = false;
</script>

<div class="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
	<!-- Header -->
	<div class="bg-primary text-primary-content">
		<div class="max-w-7xl mx-auto px-4 py-6 text-center">
			<h1 class="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">👓 Optometry's Meeting 2025</h1>

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

	<!-- AI Assistant Notice -->
	<div class=" text-info-content">
		<div class="max-w-7xl mx-auto px-4 py-4">
			<div class="flex flex-col md:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<div class="text-2xl">🤖</div>
					<div>
						<h3 class="font-bold text-lg">Need Help Finding Something?</h3>
						<p class="text-sm opacity-90">
							Ask our OM Assistant about events, requirements, locations, and more!
						</p>
					</div>
				</div>
				<button
					class="btn btn-outline btn-sm text-info-content border-info-content hover:bg-info-content hover:text-info gap-2"
					on:click={() => (chatbotOpen = true)}
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

	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Enhanced Search and Filter Controls -->
		<div class="card bg-base-100 shadow-xl mb-8 sticky top-4 z-20">
			<div class="card-body p-4 md:p-6">
				<!-- Search Bar -->
				<div class="form-control mb-6">
					<div class="input-group">
						<input
							type="text"
							placeholder="Search events, times, or notes..."
							class="input input-bordered flex-1"
							bind:value={scheduleLogic.searchTerm}
						/>
						{#if scheduleLogic.searchTerm}
							<button
								class="btn btn-square btn-outline"
								on:click={() => scheduleLogic.clearSearch()}
							>
								✕
							</button>
						{/if}
					</div>
				</div>

				<!-- Requirement Filter Section -->
				<div class="mb-6">
					<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">🎯 Event Requirements</h3>
					<div class="flex flex-wrap gap-2">
						<button
							class="btn btn-sm"
							class:btn-primary={scheduleLogic.filters.requirementFilter === 'all'}
							class:btn-outline={scheduleLogic.filters.requirementFilter !== 'all'}
							on:click={() => scheduleLogic.setRequirementFilter('all')}
						>
							All Events
						</button>
						<button
							class="btn btn-sm"
							class:btn-success={scheduleLogic.filters.requirementFilter === 'required'}
							class:btn-outline={scheduleLogic.filters.requirementFilter !== 'required'}
							on:click={() => scheduleLogic.setRequirementFilter('required')}
						>
							✅ Required Only ({scheduleLogic.requiredCount})
						</button>
						<button
							class="btn btn-sm"
							class:btn-ghost={scheduleLogic.filters.requirementFilter === 'optional'}
							class:btn-outline={scheduleLogic.filters.requirementFilter !== 'optional'}
							on:click={() => scheduleLogic.setRequirementFilter('optional')}
						>
							🎟️ Optional Only
						</button>
					</div>
				</div>

				<!-- Day Filter Section -->
				<div class="mb-6">
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
								on:click={() => scheduleLogic.toggleDayFilter(day)}
							>
								{day}
								{#if scheduleLogic.filters.selectedDays.has(day)}
									<span class="ml-1">✓</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Category Filter Section - Collapsible -->
				<div class="mb-6">
					<button
						class="flex items-center gap-2 text-lg font-semibold mb-3 hover:text-primary transition-colors"
						on:click={() =>
							(scheduleLogic.showCategoryFilters = !scheduleLogic.showCategoryFilters)}
					>
						🏷️ Filter by Category
						{#if scheduleLogic.filters.selectedCategories.size > 0}
							<div class="badge badge-info">
								{scheduleLogic.filters.selectedCategories.size} selected
							</div>
						{/if}
						<span class="text-sm ml-auto">
							{scheduleLogic.showCategoryFilters ? '▼' : '▶'}
						</span>
					</button>

					{#if scheduleLogic.showCategoryFilters}
						<div class="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-200">
							{#each scheduleLogic.uniqueCategories as category (category)}
								<button
									class="btn btn-sm gap-1"
									class:btn-active={scheduleLogic.filters.selectedCategories.has(category)}
									class:btn-outline={!scheduleLogic.filters.selectedCategories.has(category)}
									on:click={() => scheduleLogic.toggleCategoryFilter(category)}
								>
									{scheduleLogic.getCategoryDisplayName(category)}
									{#if scheduleLogic.filters.selectedCategories.has(category)}
										<span class="ml-1">✓</span>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Control Bar -->
				<div
					class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-base-200"
				>
					<div class="flex flex-wrap items-center gap-4">
						<div class="text-sm text-base-content/70">
							Showing {scheduleLogic.filteredSchedule.length} of {scheduleLogic.schedule.length} events
						</div>
						{#if scheduleLogic.activeFiltersCount > 0}
							<button
								class="btn btn-sm btn-warning gap-2"
								on:click={() => scheduleLogic.clearAllFilters()}
							>
								Clear All Filters
								<div class="badge badge-warning-content">{scheduleLogic.activeFiltersCount}</div>
							</button>
						{/if}
					</div>

					<div class="btn-group">
						<button
							class="btn btn-sm"
							class:btn-active={scheduleLogic.viewMode === 'cards'}
							on:click={() => scheduleLogic.setViewMode('cards')}
						>
							🗃️ Cards
						</button>
						<button
							class="btn btn-sm"
							class:btn-active={scheduleLogic.viewMode === 'table'}
							on:click={() => scheduleLogic.setViewMode('table')}
						>
							📊 Table
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
				<button class="btn btn-primary" on:click={() => scheduleLogic.clearAllFilters()}>
					Clear All Filters
				</button>
			</div>
		{:else if scheduleLogic.viewMode === 'cards'}
			<!-- Card View -->
			<div class="grid gap-4 md:gap-6">
				{#each scheduleLogic.filteredSchedule as item (item.day + item.event + item.time)}
					<div
						class="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-200 border-l-4"
						class:border-l-success={item.required}
						class:border-l-base-300={!item.required}
					>
						<div class="card-body p-4 md:p-6">
							<div class="flex flex-col md:flex-row md:items-start gap-4">
								<!-- Time and Day Info -->
								<div class="md:w-48 flex-shrink-0">
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
									<h3 class="card-title text-lg md:text-xl mb-2">
										{item.event}
									</h3>
									{#if item.notes}
										<p class="text-base-content/80 text-sm leading-relaxed mb-3">
											{item.notes}
										</p>
									{/if}
									{#if item.location}
										<a
											href={item.location}
											target="_blank"
											rel="noopener noreferrer"
											class="btn btn-sm btn-outline btn-primary gap-2"
										>
											📍 View Location
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
												></path>
											</svg>
										</a>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Table View -->
			<div class="card bg-base-100 shadow-xl overflow-hidden">
				<div class="overflow-x-auto">
					<table class="table table-zebra w-full">
						<thead class="bg-base-200">
							<tr>
								<th class="w-1/6">📅 Day & Time</th>
								<th class="w-2/6">🎉 Event</th>
								<th class="w-2/6">📝 Notes</th>
								<th class="w-1/6 text-center">📍 Location</th>
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
	<footer class="bg-base-300 text-center py-8 mt-16">
		<div class="max-w-4xl mx-auto px-4">
			<p class="text-lg font-semibold mb-2">
				🎯 Pro Tip: Use multiple filters to find exactly what you need - like "Required" +
				"Wednesday" for required events on Wednesday!
			</p>
			<p class="text-sm text-base-content/70 mb-4">Built with ❤️ by your AOSA Trustee-Elect</p>
			<p class="text-xs text-base-content/60">
				Questions about events or requirements? Use the OM Assistant above! 🤖💬
			</p>
		</div>
	</footer>
</div>

<!-- OM Chatbot -->
<OMChatbot
	scheduleData={scheduleLogic.schedule}
	bind:isOpen={chatbotOpen}
	onToggle={(isOpen) => (chatbotOpen = isOpen)}
/>
