<script lang="ts" module>
	import type { Id } from '../../../convex/_generated/dataModel';

	export type TagSummary = { _id: Id<'tags'>; name: string; color?: string };
	export type TaggableModule = {
		_id: Id<'module'>;
		title: string;
		emoji?: string;
		order: number;
		tags?: TagSummary[];
	};

	export const TAG_COLORS = [
		'#605dff',
		'#f43098',
		'#00bafe',
		'#00d3bb',
		'#00d390',
		'#fcb700',
		'#f97316',
		'#ff627d',
		'#a855f7',
		'#64748b'
	];
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api.js';
	import Check from '@lucide/svelte/icons/check';
	import Pipette from '@lucide/svelte/icons/pipette';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { getErrorText } from '#lib/utils/errorHandling.js';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		classId,
		tag,
		modules,
		usedColors = []
	}: {
		open?: boolean;
		classId: Id<'class'>;
		/** The tag being edited, or null to create one. */
		tag: TagSummary | null;
		modules: TaggableModule[];
		usedColors?: string[];
	} = $props();

	const client = useConvexClient();

	let name = $state('');
	let color = $state(TAG_COLORS[0]);
	const selected = new SvelteSet<Id<'module'>>();
	let error = $state('');
	let saving = $state(false);
	let deleting = $state(false);

	const hasTag = (module: TaggableModule, tagId: Id<'tags'>) =>
		module.tags?.some((t) => t._id === tagId) ?? false;

	// Reset the form each time the dialog opens.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			name = tag?.name ?? '';
			color =
				tag?.color ??
				TAG_COLORS.find((c) => !usedColors.includes(c.toLowerCase())) ??
				TAG_COLORS[0];
			setSelection(tag ? modules.filter((m) => hasTag(m, tag._id)).map((m) => m._id) : []);
			error = '';
		});
	});

	const isCustomColor = $derived(!TAG_COLORS.includes(color.toLowerCase()));
	const allSelected = $derived(modules.length > 0 && selected.size === modules.length);

	function setSelection(ids: Id<'module'>[]) {
		selected.clear();
		for (const id of ids) selected.add(id);
	}

	function toggleModule(moduleId: Id<'module'>, checked: boolean) {
		if (checked) selected.add(moduleId);
		else selected.delete(moduleId);
	}

	async function save() {
		const trimmed = name.trim();
		if (trimmed.length < 2) {
			error = 'Give the tag a name of at least 2 characters.';
			return;
		}
		saving = true;
		error = '';
		try {
			const tagId = tag
				? tag._id
				: await client.mutation(api.tags.createTag, { classId, name: trimmed, color });
			if (tag) {
				await client.mutation(api.tags.updateTag, { tagId, classId, name: trimmed, color });
			}
			const changed = modules.filter((m) => selected.has(m._id) !== hasTag(m, tagId));
			await Promise.all(
				changed.map((m) => {
					const others = (m.tags ?? []).map((t) => t._id).filter((id) => id !== tagId);
					return client.mutation(api.tags.setModuleTags, {
						moduleId: m._id,
						tagIds: selected.has(m._id) ? [...others, tagId] : others
					});
				})
			);
			open = false;
		} catch (cause) {
			error = getErrorText(cause);
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!tag) return;
		const { _id: tagId, name: tagName } = tag;
		const moduleIds = modules.filter((m) => hasTag(m, tagId)).map((m) => m._id);
		deleting = true;
		try {
			await client.mutation(api.tags.archiveTag, { tagId, classId });
			open = false;
			toast(`Deleted “${tagName}”`, {
				description: moduleIds.length
					? `Removed from ${moduleIds.length === 1 ? '1 module' : `${moduleIds.length} modules`}.`
					: undefined,
				duration: 8000,
				action: {
					label: 'Undo',
					onClick: () =>
						client
							.mutation(api.tags.restoreTag, { tagId, classId, moduleIds })
							.then(() => toast.success(`Restored “${tagName}”`))
							.catch((cause) => toast.error(getErrorText(cause)))
				}
			});
		} catch (cause) {
			error = getErrorText(cause);
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content sheet class="gap-5 sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{tag ? 'Edit tag' : 'New tag'}</Dialog.Title>
		</Dialog.Header>
		<Dialog.CornerClose />

		<form
			id="tag-editor"
			class="flex min-h-0 flex-col gap-5"
			onsubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
			<div class="flex flex-col gap-2">
				<Label for="tag-name">Name</Label>
				<Input
					id="tag-name"
					placeholder="Midterm, Quiz 4, Chapter 2…"
					maxlength={40}
					autocomplete="off"
					bind:value={name}
				/>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium">Color</span>
				<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Tag color">
					{#each TAG_COLORS as swatch (swatch)}
						{@const active = color.toLowerCase() === swatch}
						<button
							type="button"
							class="flex size-7 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {active
								? 'ring-2 ring-foreground/60'
								: ''}"
							style:background-color={swatch}
							aria-label="Color {swatch}"
							aria-pressed={active}
							onclick={() => (color = swatch)}
						>
							{#if active}<Check size={14} strokeWidth={3} />{/if}
						</button>
					{/each}
					<label
						class="relative flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-foreground/30 text-foreground/60 ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-ring {isCustomColor
							? 'border-0 text-white ring-2 ring-foreground/60'
							: ''}"
						style:background-color={isCustomColor ? color : undefined}
					>
						<Pipette size={13} />
						<input
							type="color"
							class="absolute inset-0 size-full cursor-pointer opacity-0"
							aria-label="Custom color"
							bind:value={color}
						/>
					</label>
				</div>
			</div>

			<div class="flex min-h-0 flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">
						Modules <span class="font-normal text-foreground/55">· {selected.size} selected</span>
					</span>
					{#if modules.length > 1}
						<Button
							variant="link"
							tone="neutral"
							size="xs"
							class="text-xs text-foreground/60"
							onclick={() => setSelection(allSelected ? [] : modules.map((m) => m._id))}
						>
							{allSelected ? 'Clear' : 'Select all'}
						</Button>
					{/if}
				</div>
				{#if modules.length}
					<ul class="surface-inset max-h-64 overflow-y-auto p-1.5">
						{#each modules as module (module._id)}
							<li>
								<label
									class="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-foreground/5"
								>
									<Checkbox
										checked={selected.has(module._id)}
										onCheckedChange={(checked) => toggleModule(module._id, checked === true)}
									/>
									<span class="w-5 shrink-0 text-center">{module.emoji || '📘'}</span>
									<span class="min-w-0 flex-1 truncate">{module.title}</span>
									<span class="shrink-0 font-mono text-xs text-foreground/45"
										>{module.order + 1}</span
									>
								</label>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="surface-dashed p-4 text-center text-sm text-foreground/60">
						This class has no modules yet.
					</p>
				{/if}
			</div>

			{#if error}<p class="text-sm text-error-ink" role="alert">{error}</p>{/if}
		</form>

		<Dialog.Footer class="items-center gap-2 sm:justify-between">
			{#if tag}
				<Button
					variant="ghost"
					tone="error"
					class="sm:-ms-2"
					loading={deleting}
					disabled={saving}
					onclick={remove}
				>
					<Trash2 size={16} /> Delete
				</Button>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<Button variant="ghost" tone="neutral" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" form="tag-editor" loading={saving} disabled={deleting}>
					{tag ? 'Save' : 'Create tag'}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
