<script lang="ts">
	import { ArrowLeft, File } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import AddDocumentModal from '../../../lib/admin/AddDocumentModal.svelte';
	import EditDocumentModal from '../../../lib/admin/EditDocumentModal.svelte';
	import DeleteConfirmationModal from '../../../lib/admin/DeleteConfirmationModal.svelte';
	import EditDocumentChunks from '../../../lib/admin/EditDocumentChunks.svelte';
	import { fly } from 'svelte/transition';

	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';

	let { data }: { data: PageData } = $props();
	const userData = data.userData;
	const client = useConvexClient();

	const userContentLib = useQuery(
		api.contentLib.getContentLibByCohort,
		{
			cohortId: userData?.cohortId as Id<'cohort'>
		},
		{ initialData: data.cohortLib }
	);

	let isAddModalOpen: boolean = $state(false);
	let isEditModalOpen: boolean = $state(false);
	let editingDocument: Doc<'contentLib'> | null = $state(null);
	let isDeleteModalOpen: boolean = $state(false);
	let deletingDocument: Doc<'contentLib'> | null = $state(null);
	let isDeleting: boolean = $state(false);
	let deleteError: string = $state('');

	let currentDocView: string = $state('');
	let currentDocument: Doc<'contentLib'> | null = $state(null);
	let docView = $state(false);

	function handledocView(doc_id: string, document: Doc<'contentLib'>) {
		docView = !docView;
		currentDocView = doc_id;
		currentDocument = document;
	}

	function openAddModal() {
		isAddModalOpen = true;
	}

	function closeAddModal() {
		isAddModalOpen = false;
	}

	function editDocument(document: Doc<'contentLib'>) {
		editingDocument = document;
		isEditModalOpen = true;
	}

	function closeEditModal() {
		isEditModalOpen = false;
		editingDocument = null;
	}

	function openDeleteModal(document: Doc<'contentLib'>) {
		deletingDocument = document;
		isDeleteModalOpen = true;
	}

	function closeDeleteModal() {
		isDeleteModalOpen = false;
		deletingDocument = null;
	}

	async function handleDelete() {
		if (!deletingDocument) return;

		isDeleting = true;
		deleteError = '';

		try {
			await client.mutation(api.contentLib.deleteDocument, {
				documentId: deletingDocument._id,
				cohortId: userData?.cohortId as Id<'cohort'>
			});
			closeDeleteModal();
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Failed to delete document';
			console.error('Failed to delete document:', deleteError);
		} finally {
			isDeleting = false;
		}
	}

	function backToLibrary() {
		docView = false;
		currentDocView = '';
		currentDocument = null;
	}
</script>

<div class="min-h-screen p-8 max-w-7xl mx-auto">
	{#if docView}
		<button class="btn mb-4 btn-ghost" onclick={backToLibrary}><ArrowLeft size={16} />Back to Library</button>
	{:else}
		<a class="btn mb-4 btn-ghost" href="/admin"><ArrowLeft size={16} />Back</a>
	{/if}

	<h1 class="text-3xl font-bold text-base-content">Content Library</h1>
	<p class="text-base text-base-content/70">Add, edit, and delete documents</p>

	{#if deleteError}
		<div class="alert alert-error mt-4">
			<span>❌ {deleteError}</span>
		</div>
	{/if}

	{#if docView}
		<div in:fly={{ x: 28, duration: 220, opacity: 0.2 }} out:fly={{ x: -20, duration: 160, opacity: 0 }}>
			<EditDocumentChunks
				{handledocView}
				{currentDocView}
				{currentDocument}
			/>
		</div>
	{:else}
		<div in:fly={{ x: -28, duration: 220, opacity: 0.2 }} out:fly={{ x: 20, duration: 160, opacity: 0 }}>
			<div class="mt-12 flex flex-row justify-between">
			<h1 class="font-semibold text-2xl">My Documents</h1>
			<button class="btn btn-primary" onclick={openAddModal}><Plus size={16} /> Add Document</button
			>
			</div>

			<div class="overflow-x-auto rounded-box border border-base-300 hover:border-primary/30 transition-colors bg-base-100 mt-8" in:fly={{ y: 8, duration: 220, opacity: 0.2 }}>
			<table class="table w-full">
				<!-- head -->
				<thead>
					<tr>
						<th class="w-0 md:w-12">
							<input type="checkbox" class="checkbox checkbox-primary checkbox-sm" />
						</th>
						<th>Title</th>
						<th>Description</th>
						<th>Last Updated</th>
						<th class="w-0 md:w-10">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if userContentLib.isLoading}
						<tr>
							<td colspan="5" class="text-center">Loading...</td>
						</tr>
					{:else if userContentLib.error}
						<tr>
							<td colspan="5" class="text-center">Error loading content library</td>
						</tr>
					{:else if userContentLib.data.length === 0}
						<tr>
							<td colspan="5" class="text-center text-base-content/70"
								>Create your first document!</td
							>
						</tr>
					{:else}
						{#each userContentLib.data as doc (doc._id)}
							<tr>
								<th>
									<input type="checkbox" class="checkbox checkbox-primary checkbox-sm" />
								</th>
								<td
									><div class="badge badge-soft">
										<File size={16} class="text-base-content/40" />
										<button
											class="link hover:link-primary truncate"
											onclick={() => handledocView(doc._id, doc)}
										>
											{doc.title}</button
										>
									</div></td
								>
								<td class="text-base-content/70"
									>{doc.description ? doc.description : 'No description'}</td
								>
								<td>{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : 'Never'}</td>
								<td>
									<div class="dropdown dropdown-end">
										<button class="btn btn-ghost btn-circle btn-sm">⋮</button>
										<ul
											tabindex="-1"
											class="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow-xl border border-base-300"
										>
											<li>
												<button
													data-edit-btn
													class="btn btn-sm btn-ghost w-full justify-start font-medium"
													type="button"
													aria-label="Edit document"
													onclick={() => editDocument(doc)}
												>
													<Pencil size={16} />
													<span>Edit</span>
												</button>
											</li>
											<li>
												<button
													data-delete-btn
													class="btn btn-sm btn-ghost text-error w-full justify-start font-medium"
													type="button"
													aria-label="Delete document"
													onclick={() => openDeleteModal(doc)}
													disabled={isDeleting}
												>
													<Trash2 size={16} />
													<span>Delete</span>
												</button>
											</li>
										</ul>
									</div></td
								>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
			</div>
		</div>

		<AddDocumentModal {isAddModalOpen} {closeAddModal} {userData} />

		<EditDocumentModal {isEditModalOpen} {closeEditModal} {editingDocument} {userData} />

		<DeleteConfirmationModal
			{isDeleteModalOpen}
			onCancel={closeDeleteModal}
			onConfirm={handleDelete}
			itemName={deletingDocument?.title}
			itemType="document"
		/>
	{/if}
</div>
