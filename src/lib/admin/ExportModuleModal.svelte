<script lang="ts">
	import { X, FileText, FileJson, FileSpreadsheet } from 'lucide-svelte';
	import type { Doc } from '../../convex/_generated/dataModel';

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

<dialog class="modal" class:modal-open={isOpen}>
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onclick={onClose}>
				<X size={18} />
			</button>
		</form>
		
		<h3 class="font-bold text-lg mb-2">Export Questions</h3>
		<p class="text-sm text-base-content/70 mb-6">
			Exporting content for <span class="font-semibold">{moduleItem?.title}</span>. Choose a format below.
		</p>

		<div class="grid grid-cols-1 gap-3">
			<button 
				class="btn btn-outline justify-start h-auto py-3 px-4 flex-nowrap group hover:btn-primary hover:text-primary-content transition-all"
				onclick={() => onExport('txt')}
				disabled={isExporting}
			>
				<div class="bg-base-200 p-2 rounded-lg group-hover:bg-primary-content/20 text-base-content group-hover:text-primary-content transition-colors">
					<FileText size={24} />
				</div>
				<div class="text-left ml-2 flex-1">
					<div class="font-semibold">Text File (.txt)</div>
					<div class="text-xs opacity-70 font-normal">Simple readable format</div>
				</div>
			</button>

			<button 
				class="btn btn-outline justify-start h-auto py-3 px-4 flex-nowrap group hover:btn-secondary hover:text-secondary-content transition-all"
				onclick={() => onExport('json')}
				disabled={isExporting}
			>
				<div class="bg-base-200 p-2 rounded-lg group-hover:bg-secondary-content/20 text-base-content group-hover:text-secondary-content transition-colors">
					<FileJson size={24} />
				</div>
				<div class="text-left ml-2 flex-1">
					<div class="font-semibold">JSON Data (.json)</div>
					<div class="text-xs opacity-70 font-normal">Structured data for developers</div>
				</div>
			</button>

			<button 
				class="btn btn-outline justify-start h-auto py-3 px-4 flex-nowrap group hover:btn-accent hover:text-accent-content transition-all"
				onclick={() => onExport('csv')}
				disabled={isExporting}
			>
				<div class="bg-base-200 p-2 rounded-lg group-hover:bg-accent-content/20 text-base-content group-hover:text-accent-content transition-colors">
					<FileSpreadsheet size={24} />
				</div>
				<div class="text-left ml-2 flex-1">
					<div class="font-semibold">Spreadsheet (.csv)</div>
					<div class="text-xs opacity-70 font-normal">Excel compatible format</div>
				</div>
			</button>
		</div>

		<div class="modal-action">
			<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
		</div>
	</div>
	<div class="modal-backdrop bg-black/50" onclick={onClose}></div>
</dialog>
