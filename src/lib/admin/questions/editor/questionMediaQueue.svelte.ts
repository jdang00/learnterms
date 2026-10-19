import type { ConvexClient } from 'convex/browser';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api.js';
import { toastStore } from '#lib/stores/toast.svelte.js';
import { uploadQuestionImage } from '#lib/utils/uploadQuestionImage.js';
import { MAX_QUESTION_IMAGES, validateQuestionImage } from '#lib/utils/questionMediaUpload.js';

export type QueuedMedia = {
	uploadId: Id<'questionMediaUploads'>;
	url: string;
	name?: string;
	caption?: string;
	showOnSolution?: boolean;
};

/** Images uploaded for a question before it is saved. */
export class QuestionMediaQueue {
	queued = $state<QueuedMedia[]>([]);
	isUploading = $state(false);
	uploadProgress = $state(0);
	uploadLabel = $state('');
	uploadError = $state('');
	isDragging = $state(false);
	private readonly controller = new AbortController();

	constructor(
		private readonly client: ConvexClient,
		private readonly context: {
			moduleId: () => Id<'module'>;
			existingCount: () => number;
			busy: () => boolean;
			onChange: () => void;
		}
	) {}

	private fail(message: string, error?: unknown) {
		this.uploadError = message;
		if (error) {
			console.error(message, error);
		} else {
			console.error(message);
		}
		toastStore.error(message);
	}

	async upload(files: File[]) {
		if (this.isUploading || this.context.busy() || files.length === 0) return;
		this.uploadError = '';
		if (this.context.existingCount() + this.queued.length + files.length > MAX_QUESTION_IMAGES) {
			this.fail(`A question can have up to ${MAX_QUESTION_IMAGES} images.`);
			return;
		}
		try {
			for (const file of files) validateQuestionImage(file.type, file.size);
		} catch (error) {
			this.fail(error instanceof Error ? error.message : 'Unsupported image.');
			return;
		}
		this.isUploading = true;
		try {
			for (const file of files) {
				this.uploadLabel = file.name;
				this.uploadProgress = 0;
				const uploadId = await uploadQuestionImage(
					this.client,
					this.context.moduleId(),
					file,
					this.controller.signal,
					(percent) => {
						this.uploadProgress = percent;
					}
				);
				this.queued = [
					...this.queued,
					{
						uploadId,
						url: URL.createObjectURL(file),
						name: file.name,
						caption: '',
						showOnSolution: false
					}
				];
				this.context.onChange();
			}
		} catch (error) {
			if (!this.controller.signal.aborted)
				this.fail(error instanceof Error ? error.message : 'Image upload failed.');
		} finally {
			this.isUploading = false;
		}
	}

	handleDrop(event: DragEvent) {
		event.preventDefault();
		this.isDragging = false;
		void this.upload(Array.from(event.dataTransfer?.files ?? []));
	}

	async handlePaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items;
		if (!items) return;
		const files: File[] = [];
		for (const item of items) {
			if (item.kind === 'file') {
				const file = item.getAsFile();
				if (file) files.push(file);
			}
		}
		if (files.length === 0) return;
		event.preventDefault();
		await this.upload(files);
	}

	async remove(index: number) {
		const media = this.queued[index];
		if (!media || this.context.busy()) return;
		await this.client
			.mutation(api.questionMediaUploads.discard, { uploadId: media.uploadId })
			.catch(() => {});
		URL.revokeObjectURL(media.url);
		this.queued = this.queued.filter((_, i) => i !== index);
		this.context.onChange();
	}

	imagesForSave() {
		return this.queued.map((media) => ({
			uploadId: media.uploadId,
			altText: media.name ?? '',
			caption: media.caption,
			showOnSolution: media.showOnSolution
		}));
	}

	/** After a save the uploads belong to the question; only the previews are released. */
	clear() {
		for (const media of this.queued) URL.revokeObjectURL(media.url);
		this.queued = [];
	}

	/** On unmount, abort in-flight uploads and discard anything that was never saved. */
	dispose() {
		this.controller.abort();
		for (const media of this.queued) {
			URL.revokeObjectURL(media.url);
			void this.client
				.mutation(api.questionMediaUploads.discard, { uploadId: media.uploadId })
				.catch(() => {});
		}
	}
}
