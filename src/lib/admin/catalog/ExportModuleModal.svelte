<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import FileJson from '@lucide/svelte/icons/file-json';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import type { Doc } from '../../../convex/_generated/dataModel';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	// Define a compatible type that matches what the parent passes
	// The parent passes a Doc<'module'> extended with questionCount and tags
	type ModuleItem = Doc<'module'> & {
		questionCount: number;
		tags?: { _id: string; name: string; color?: string }[];
	};

	let {
		isOpen,
		onClose,
		onExport,
		moduleItem,
		isExporting
	}: {
		isOpen: boolean;
		onClose: () => void;
		onExport: (format: 'txt' | 'json' | 'csv') => void;
		moduleItem: ModuleItem | null;
		isExporting: boolean;
	} = $props();
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Export Questions</Dialog.Title>
			<Dialog.Description class="text-sm text-foreground/70">
				Exporting content for <span class="font-semibold">{moduleItem?.title}</span>. Choose a
				format below.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid grid-cols-1 gap-3">
			<Button
				variant="outline"
				tone="neutral"
				shape="rect"
				class="group h-auto flex-nowrap justify-start px-4 py-3 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
				onclick={() => onExport('txt')}
				disabled={isExporting}
			>
				<div
					class="bg-muted p-2 rounded-xl group-hover:bg-primary-foreground/20 text-foreground group-hover:text-primary-foreground transition-colors"
				>
					<FileText size={24} />
				</div>
				<div class="text-left ml-2 flex-1">
					<div class="font-semibold">Text File (.txt)</div>
					<div class="text-xs opacity-70 font-normal">Simple readable format</div>
				</div>
			</Button>

			<Button
				variant="outline"
				tone="neutral"
				shape="rect"
				class="group h-auto flex-nowrap justify-start px-4 py-3 transition-all hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
				onclick={() => onExport('json')}
				disabled={isExporting}
			>
				<div
					class="bg-muted p-2 rounded-xl group-hover:bg-secondary-foreground/20 text-foreground group-hover:text-secondary-foreground transition-colors"
				>
					<FileJson size={24} />
				</div>
				<div class="text-left ml-2 flex-1">
					<div class="font-semibold">JSON Data (.json)</div>
					<div class="text-xs opacity-70 font-normal">Structured data for developers</div>
				</div>
			</Button>

			<Button
				variant="outline"
				tone="neutral"
				shape="rect"
				class="group h-auto flex-nowrap justify-start px-4 py-3 transition-all hover:border-accent hover:bg-accent hover:text-accent-foreground"
				onclick={() => onExport('csv')}
				disabled={isExporting}
			>
				<div
					class="bg-muted p-2 rounded-xl group-hover:bg-accent-foreground/20 text-foreground group-hover:text-accent-foreground transition-colors"
				>
					<FileSpreadsheet size={24} />
				</div>
				<div class="text-left ml-2 flex-1">
					<div class="font-semibold">Spreadsheet (.csv)</div>
					<div class="text-xs opacity-70 font-normal">Excel compatible format</div>
				</div>
			</Button>
		</div>

		<Dialog.Footer>
			<Button variant="ghost" tone="neutral" onclick={onClose}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
