<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { useConvexClient } from 'convex-svelte';
	import type { FunctionArgs, FunctionReturnType } from 'convex/server';
	import { api } from '../../../../convex/_generated/api.js';
	import type { Id } from '../../../../convex/_generated/dataModel';
	import { MAX_QUESTION_IMAGES, QUESTION_IMAGE_ACCEPT } from '#lib/utils/questionMediaUpload.js';
	import type { QuestionMediaQueue } from './questionMediaQueue.svelte';
	import type { QuestionEditorState, QuestionItem } from './questionEditor.svelte';

	type QuestionMediaItem = FunctionReturnType<typeof api.questionMedia.getByQuestionId>[number];
	type UpdateQuestionMediaArgs = FunctionArgs<typeof api.questionMedia.update>;

	let {
		form,
		media,
		editingQuestion,
		existingMedia = $bindable()
	}: {
		form: QuestionEditorState;
		media: QuestionMediaQueue;
		editingQuestion: QuestionItem | null;
		existingMedia: QuestionMediaItem[];
	} = $props();

	const client = useConvexClient();
	const solutionLabel = $derived(
		form.isFreeResponse ? 'Show with ground truth' : 'Show on rationale'
	);

	// Fetch existing media when in edit mode
	async function refreshMedia() {
		if (!editingQuestion) return;
		try {
			const items = await client.query(api.questionMedia.getByQuestionId, {
				questionId: editingQuestion._id as Id<'question'>
			});
			existingMedia = [...(items ?? [])].sort((a, b) => a.order - b.order);
		} catch (e) {
			console.error('Failed to fetch media:', e);
		}
	}

	async function removeExistingMedia(id: string) {
		try {
			await client.mutation(api.questionMedia.softDelete, { mediaId: id as Id<'questionMedia'> });
			await refreshMedia();
			form.touch();
		} catch (e) {
			console.error('Failed to remove media:', e);
		}
	}

	async function commitExistingMediaChange(
		id: string,
		altText: string,
		caption: string,
		showOnSolution?: boolean
	) {
		try {
			const payload: UpdateQuestionMediaArgs = {
				mediaId: id as Id<'questionMedia'>,
				altText,
				caption,
				showOnSolution
			};
			await client.mutation(api.questionMedia.update, payload);
			await refreshMedia();
		} catch (e) {
			console.error('Failed to update media:', e);
			return;
		}
		form.touch();
	}
</script>

<div>
	<div class="label-caps mb-2 flex items-center gap-2">
		<ImageIcon size={14} /> Attachments
	</div>

	<div class="space-y-3">
		{#if existingMedia.length > 0 || media.queued.length > 0}
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<!-- Existing Media -->
				{#each existingMedia as m (m._id)}
					<div class="surface overflow-hidden">
						<div class="relative group">
							<img src={m.url} alt={m.altText} class="w-full h-32 object-cover" />
							<Button
								variant="solid"
								tone="error"
								size="xs"
								shape="circle"
								class="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
								onclick={() => removeExistingMedia(m._id)}
							>
								<Trash2 size={12} />
							</Button>
						</div>
						<div class="p-3 space-y-2">
							<Input
								class="h-8 px-3 text-sm"
								placeholder="Alt text"
								bind:value={m.altText}
								onblur={() =>
									commitExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution)}
							/>
							<Input
								class="h-8 px-3 text-sm"
								placeholder="Caption (optional)"
								bind:value={m.caption}
								onblur={() =>
									commitExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution)}
							/>
							<label class="flex cursor-pointer items-center justify-start gap-2 p-0 text-xs">
								<Checkbox
									class="size-3.5"
									checked={m.showOnSolution}
									onCheckedChange={(checked) => {
										m.showOnSolution = checked === true;
										commitExistingMediaChange(m._id, m.altText, m.caption || '', m.showOnSolution);
									}}
								/>
								<span>{solutionLabel}</span>
							</label>
						</div>
					</div>
				{/each}

				<!-- Queued Media -->
				{#each media.queued as m, idx (idx)}
					<div class="border border-primary/50 rounded-2xl overflow-hidden bg-background relative">
						<Badge variant="solid" tone="primary" size="xs" class="absolute top-2 left-2 z-10"
							>New</Badge
						>
						<div class="relative">
							<img src={m.url} alt={m.name} class="w-full h-32 object-cover" />
							<Button
								variant="solid"
								tone="error"
								size="xs"
								shape="circle"
								class="absolute top-1 right-1 z-10"
								onclick={() => media.remove(idx)}
							>
								<Trash2 size={12} />
							</Button>
						</div>
						<div class="p-3 space-y-2">
							<Input
								class="h-8 px-3 text-sm"
								placeholder="Alt text"
								bind:value={m.name}
								oninput={() => form.touch()}
							/>
							<Input
								class="h-8 px-3 text-sm"
								placeholder="Caption (optional)"
								bind:value={m.caption}
								oninput={() => form.touch()}
							/>
							<label class="flex cursor-pointer items-center justify-start gap-2 p-0 text-xs">
								<Checkbox
									class="size-3.5"
									checked={m.showOnSolution}
									onCheckedChange={(checked) => {
										m.showOnSolution = checked === true;
										form.touch();
									}}
								/>
								<span>{solutionLabel}</span>
							</label>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<label
			class="relative min-h-36 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 {media.isDragging
				? 'border-primary bg-primary/10'
				: 'border-border bg-background/50'} {media.isUploading || form.isSubmitting
				? 'opacity-60'
				: 'cursor-pointer hover:border-primary'}"
			ondragover={(event) => {
				event.preventDefault();
				media.isDragging = true;
			}}
			ondragleave={() => {
				media.isDragging = false;
			}}
			ondrop={(event) => media.handleDrop(event)}
		>
			<ImageIcon size={24} class="text-foreground/50" />
			<span class="mt-2 text-sm font-semibold"
				>{media.isUploading
					? media.uploadProgress === 100
						? 'Checking image…'
						: `Uploading ${media.uploadProgress}%`
					: 'Add images'}</span
			>
			<span class="mt-1 text-xs text-foreground/60"
				>{media.isUploading ? media.uploadLabel : 'Browse, drag & drop, or paste an image'}</span
			>
			<span class="mt-1 text-xs text-foreground/50"
				>PNG, JPEG, WebP, GIF · 8 MB each · up to {MAX_QUESTION_IMAGES} images</span
			>
			<input
				type="file"
				class="absolute inset-0 opacity-0 cursor-pointer"
				aria-label="Upload question images"
				accept={QUESTION_IMAGE_ACCEPT}
				multiple
				disabled={media.isUploading || form.isSubmitting}
				onchange={(event) => {
					void media.upload(Array.from(event.currentTarget.files ?? []));
					event.currentTarget.value = '';
				}}
			/>
		</label>
		{#if media.uploadError}<p class="text-sm text-error-ink" role="alert">
				{media.uploadError}
			</p>{/if}
	</div>
</div>
