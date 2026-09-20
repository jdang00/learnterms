<script lang="ts">
	import { BookOpen, ChevronDown, Layers } from 'lucide-svelte';
	import type { Doc, Id } from '../../convex/_generated/dataModel';
	import type { ClassWithSemester } from '$lib/types';
	interface Props {
		currentSemester: string;
		semesters?: Doc<'semester'>[];
		selectedClass: ClassWithSemester | null;
		selectedModuleId: Id<'module'> | null;
		selectedModuleTitle: string;
		searchedClasses: ClassWithSemester[];
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
		searchedClasses,
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

<section class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
	<span class="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-base-content/40">
		Save to
	</span>
	<div class="relative">
		<button
			type="button"
			class="btn btn-sm gap-2 rounded-full"
			onclick={() => {
				classOpen = !classOpen;
				classSearch = '';
			}}
		>
			<BookOpen size={14} class="text-base-content/60" />
			<span class="max-w-[220px] truncate text-sm">{selectedClass?.name || 'Class'}</span>
			<ChevronDown size={12} />
		</button>
		{#if classOpen}
			<div class="fixed inset-0 z-30" onclick={() => (classOpen = false)} role="none"></div>
			<div
				class="absolute left-0 top-full z-40 mt-1 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-base-300 bg-base-100 p-2 shadow-lg"
			>
				{#if semesters && semesters.length > 1}
					<div class="mb-1.5 flex flex-wrap gap-1 px-1">
						{#each semesters as semester (semester._id)}
							<button
								type="button"
								class="rounded-full px-2.5 py-1 text-[11px] font-medium transition {currentSemester ===
								semester.name
									? 'bg-primary text-primary-content'
									: 'bg-base-200 text-base-content/60 hover:bg-base-300'}"
								onclick={() => onSelectSemester(semester.name)}
							>
								{semester.name}
							</button>
						{/each}
					</div>
				{/if}
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
			<span class="max-w-[220px] truncate text-sm">{selectedModuleTitle || 'Module'}</span>
			<ChevronDown size={12} />
		</button>
		{#if moduleOpen}
			<div class="fixed inset-0 z-30" onclick={() => (moduleOpen = false)} role="none"></div>
			<div
				class="absolute left-0 top-full z-40 mt-1 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-base-300 bg-base-100 p-2 shadow-lg"
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
</section>
