<script lang="ts">
	import { BookOpen, Check, ChevronDown, FolderOpen, Layers } from 'lucide-svelte';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import type { ClassWithSemester } from '$lib/types';

	interface Props {
		currentSemester: string;
		semesters?: Doc<'semester'>[];
		selectedClass: ClassWithSemester | null;
		selectedModuleId: Id<'module'> | null;
		selectedModuleTitle: string;
		filteredClasses: ClassWithSemester[];
		searchedClasses: ClassWithSemester[];
		modules?: Doc<'module'>[];
		searchedModules: Doc<'module'>[];
		classOpen?: boolean;
		moduleOpen?: boolean;
		classSearch?: string;
		moduleSearch?: string;
		onSelectSemester: (name: string) => void;
		onSelectClass: (classItem: ClassWithSemester) => void;
		onSelectModule: (moduleItem: Doc<'module'>) => void;
	}

	let {
		currentSemester,
		semesters,
		selectedClass,
		selectedModuleId,
		selectedModuleTitle,
		filteredClasses,
		searchedClasses,
		modules,
		searchedModules,
		classOpen = $bindable(false),
		moduleOpen = $bindable(false),
		classSearch = $bindable(''),
		moduleSearch = $bindable(''),
		onSelectSemester,
		onSelectClass,
		onSelectModule
	}: Props = $props();
</script>

<div class="card border border-base-300 bg-base-100 shadow-xs">
	<div class="card-body gap-3 p-4 sm:p-5">
		<div class="flex items-center gap-2.5">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl {selectedModuleId
					? 'bg-success/15 text-success'
					: 'bg-primary/10 text-primary'}"
			>
				{#if selectedModuleId}<Check size={16} />{:else}<Layers size={16} />{/if}
			</span>
			<div class="min-w-0">
				<h2 class="text-sm font-semibold">Where should these questions go?</h2>
				<p class="text-xs text-base-content/55">Choose the class and module to save into.</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-1.5">
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-sm gap-2 rounded-full">
					<FolderOpen size={14} class="text-base-content/60" />
					<span class="text-sm">{currentSemester || 'Semester'}</span>
					<ChevronDown size={12} />
				</div>
				{#if semesters}
					<ul
						class="dropdown-content menu z-30 w-56 rounded-2xl border border-base-300 bg-base-100 p-1 shadow-lg"
					>
						{#each semesters as semester (semester._id)}
							<li>
								<button
									class="rounded-xl text-sm"
									class:active={currentSemester === semester.name}
									onclick={() => onSelectSemester(semester.name)}
								>
									{semester.name}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<span class="text-base-content/25">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-sm gap-2 rounded-full"
					class:btn-disabled={!currentSemester}
					onclick={() => {
						classOpen = !classOpen;
						classSearch = '';
					}}
				>
					<BookOpen size={14} class="text-base-content/60" />
					<span class="max-w-[260px] truncate text-sm">{selectedClass?.name || 'Class'}</span>
					<ChevronDown size={12} />
				</button>
				{#if classOpen && filteredClasses.length > 0}
					<div class="fixed inset-0 z-30" onclick={() => (classOpen = false)} role="none"></div>
					<div
						class="absolute left-0 top-full z-40 mt-1 w-80 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-lg"
					>
						<input
							type="text"
							placeholder="Search classes..."
							class="input input-bordered input-sm mb-1 w-full rounded-full"
							bind:value={classSearch}
						/>
						<ul class="max-h-52 overflow-y-auto">
							{#each searchedClasses as classItem (classItem._id)}
								<li>
									<button
										type="button"
										class="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm {selectedClass?._id ===
										classItem._id
											? 'bg-primary text-primary-content'
											: 'hover:bg-base-200'}"
										onclick={() => onSelectClass(classItem)}
									>
										<span class="truncate">{classItem.name}</span>
										{#if classItem.code}
											<span class="badge badge-ghost badge-xs">{classItem.code}</span>
										{/if}
									</button>
								</li>
							{/each}
							{#if searchedClasses.length === 0}
								<li class="px-3 py-2 text-xs text-base-content/50">No matches</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>

			<span class="text-base-content/25">/</span>

			<div class="relative">
				<button
					type="button"
					class="btn btn-sm gap-2 rounded-full"
					class:btn-disabled={!selectedClass}
					onclick={() => {
						moduleOpen = !moduleOpen;
						moduleSearch = '';
					}}
				>
					<Layers size={14} class="text-base-content/60" />
					<span class="max-w-[260px] truncate text-sm">{selectedModuleTitle || 'Module'}</span>
					<ChevronDown size={12} />
				</button>
				{#if moduleOpen && modules && modules.length > 0}
					<div class="fixed inset-0 z-30" onclick={() => (moduleOpen = false)} role="none"></div>
					<div
						class="absolute left-0 top-full z-40 mt-1 w-80 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-lg"
					>
						<input
							type="text"
							placeholder="Search modules..."
							class="input input-bordered input-sm mb-1 w-full rounded-full"
							bind:value={moduleSearch}
						/>
						<ul class="max-h-52 overflow-y-auto">
							{#each searchedModules as moduleItem (moduleItem._id)}
								<li>
									<button
										type="button"
										class="w-full truncate rounded-xl px-3 py-1.5 text-left text-sm {selectedModuleId ===
										moduleItem._id
											? 'bg-primary text-primary-content'
											: 'hover:bg-base-200'}"
										onclick={() => onSelectModule(moduleItem)}
									>
										{moduleItem.title}
									</button>
								</li>
							{/each}
							{#if searchedModules.length === 0}
								<li class="px-3 py-2 text-xs text-base-content/50">No matches</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
