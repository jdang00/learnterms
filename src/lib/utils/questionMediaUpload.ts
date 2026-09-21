export const MAX_QUESTION_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_QUESTION_IMAGES = 12;
export const QUESTION_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const QUESTION_IMAGE_ACCEPT = QUESTION_IMAGE_TYPES.join(',');

export function validateQuestionImage(mimeType: string, size: number) {
	if (!QUESTION_IMAGE_TYPES.some((type) => type === mimeType)) {
		throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
	}
	if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_QUESTION_IMAGE_BYTES) {
		throw new Error('Images must be between 1 byte and 8 MB.');
	}
}
