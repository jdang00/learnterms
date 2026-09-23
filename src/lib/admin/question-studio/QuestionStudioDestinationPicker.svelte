<script lang="ts">
	import { BookOpen, Layers } from 'lucide-svelte';
	import PickerSemesterFilter from '$lib/components/PickerSemesterFilter.svelte';
	import SearchablePicker from '$lib/components/SearchablePicker.svelte';
	import type { Doc, Id } from '../../../convex/_generated/dataModel';
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

<SearchablePicker
	size="md"
	label={selectedClass?.name || 'a class'}
	placeholder="Search classes…"
	value={selectedClass?._id ?? ''}
	options={searchedClasses.map((c) => ({ value: c._id, label: c.name, detail: c.code }))}
	bind:open={classOpen}
	bind:search={classSearch}
	onSelect={(id) => {
		const item = searchedClasses.find((c) => c._id === id);
		if (item) onSelectClass(item);
	}}
>
	{#snippet icon()}<BookOpen size={16} class="shrink-0" />{/snippet}
	{#snippet header()}
		{#if semesters && semesters.length > 1}
			<PickerSemesterFilter
				options={semesters.map((s) => ({ value: s.name, label: s.name }))}
				value={currentSemester}
				onSelect={onSelectSemester}
			/>
		{/if}
	{/snippet}
</SearchablePicker>
<span class="text-base-content/60">/</span>
<SearchablePicker
	size="md"
	label={selectedModuleTitle || 'a module'}
	placeholder="Search modules…"
	disabled={!selectedClass}
	value={selectedModuleId ?? ''}
	options={searchedModules.map((m) => ({ value: m._id, label: m.title }))}
	bind:open={moduleOpen}
	bind:search={moduleSearch}
	onSelect={(id) => {
		const item = searchedModules.find((m) => m._id === id);
		if (item) onSelectModule(item);
	}}
>
	{#snippet icon()}<Layers size={16} class="shrink-0" />{/snippet}
</SearchablePicker>
