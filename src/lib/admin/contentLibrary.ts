import { FileText, Image as ImageIcon, Presentation } from 'lucide-svelte';
import type { Doc } from '../../convex/_generated/dataModel';

export type ViewMode = 'grid' | 'list';
export type SortKey = 'recent' | 'name' | 'oldest' | 'size' | 'type';
export type DrawerTab = 'preview' | 'source' | 'properties';

export type FileKind = {
	label: string;
	icon: typeof FileText;
	accent: string;
	tint: string;
	hue: string;
};

export const sortOptions: Array<{ key: SortKey; label: string }> = [
	{ key: 'recent', label: 'Recently updated' },
	{ key: 'name', label: 'Name (A-Z)' },
	{ key: 'oldest', label: 'Oldest first' },
	{ key: 'size', label: 'Largest first' },
	{ key: 'type', label: 'File type' }
];

export function formatPages(count?: number) {
	if (!count || count < 1) return null;
	return `${count} ${count === 1 ? 'page' : 'pages'}`;
}

export function formatSize(bytes?: number) {
	if (!bytes) return '-';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function relativeTime(timestamp?: number) {
	if (!timestamp) return 'Just added';
	const diff = Date.now() - timestamp;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'Just now';
	if (mins < 60) return `${mins} min ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours} hr ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
	if (days < 30) return `${Math.floor(days / 7)} wk ago`;
	return new Date(timestamp).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatDate(timestamp?: number) {
	if (!timestamp) return '-';
	return new Date(timestamp).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

export function fileKind(doc: Doc<'contentLib'>): FileKind {
	const mime = doc.metadata?.mimeType ?? '';
	const name = (doc.metadata?.originalFileName ?? doc.title ?? '').toLowerCase();
	if (mime === 'application/pdf' || name.endsWith('.pdf')) {
		return {
			label: 'PDF',
			icon: FileText,
			accent: 'text-error',
			tint: 'bg-error/10',
			hue: 'var(--color-error)'
		};
	}
	if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
		return {
			label: 'Slides',
			icon: Presentation,
			accent: 'text-warning',
			tint: 'bg-warning/10',
			hue: 'var(--color-warning)'
		};
	}
	if (mime.startsWith('image/')) {
		return {
			label: 'Image',
			icon: ImageIcon,
			accent: 'text-secondary',
			tint: 'bg-secondary/10',
			hue: 'var(--color-secondary)'
		};
	}
	return {
		label: 'Document',
		icon: FileText,
		accent: 'text-primary',
		tint: 'bg-primary/10',
		hue: 'var(--color-primary)'
	};
}
