<script lang="ts">
	import {
		ArrowLeft,
		File,
		Plus,
		Pencil,
		Trash2,
		Search,
		Clock3,
		MoreVertical
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import AddDocumentModal from '../../../lib/admin/AddDocumentModal.svelte';
	import EditDocumentModal from '../../../lib/admin/EditDocumentModal.svelte';
	import DeleteConfirmationModal from '../../../lib/admin/DeleteConfirmationModal.svelte';
	import EditDocumentChunks from '../../../lib/admin/EditDocumentChunks.svelte';
	import { fly } from 'svelte/transition';

	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '../../../convex/_generated/api';
	import type { Id, Doc } from '../../../convex/_generated/dataModel';
	import { useClerkContext } from 'svelte-clerk';

	let { data }: { data: PageData } = $props();
	const client = useConvexClient();

	const clerk = useClerkContext();
	const clerkUser = $derived(clerk.user);

	// useQuery at top level with skip pattern
	const userDataQuery = useQuery(
		api.users.getUserById,
		() => clerkUser ? { id: clerkUser.id } : 'skip'
	);

	// useQuery at top level with skip pattern - depends on userDataQuery
	const userContentLib = useQuery(
		api.contentLib.getContentLibByCohort,
		() => userDataQuery.data?.cohortId ? { cohortId: userDataQuery.data.cohortId as Id<'cohort'> } : 'skip'
	);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const openId = params.get('open');
		if (!openId) return;
		const target = userContentLib?.data?.find?.((d) => d._id === openId);
		if (target) {
			docView = true;
			currentDocView = openId;
			currentDocument = target;
			params.delete('open');
			const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
			history.replaceState({}, '', newUrl);
		}
	});

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
	let searchTerm: string = $state('');

	const filteredDocs = $derived.by<Doc<'contentLib'>[]>(() => {
		const docs = userContentLib.data ?? [];
		const search = searchTerm.trim().toLowerCase();

		let next = docs.filter((doc) => {
			const matchesSearch =
				!search ||
				doc.title.toLowerCase().includes(search) ||
				(doc.description ?? '').toLowerCase().includes(search);

			return matchesSearch;
		});

		next = [...next].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

		return next;
	});

	const totalDocs = $derived.by(() => userContentLib.data?.length ?? 0);

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
			const cohortId = userDataQuery.data?.cohortId as Id<'cohort'> | undefined;
			if (!cohortId) throw new Error('Missing cohort');
			await client.mutation(api.contentLib.deleteDocument, {
				documentId: deletingDocument._id,
				cohortId
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
		<button class="btn mb-4 btn-ghost" onclick={backToLibrary}
			><ArrowLeft size={16} />Back to Library</button
		>
	{:else}
		<a class="btn mb-4 btn-ghost" href="/admin"><ArrowLeft size={16} />Back</a>
	{/if}

	<div class="mb-8">
		<h1 class="text-3xl font-bold text-base-content">Content Library</h1>
		<p class="text-base text-base-content/70">Add, edit, and delete documents</p>
	</div>

	{#if deleteError}
		<div class="alert alert-error mt-4 text-sm">
			<span>{deleteError}</span>
		</div>
	{/if}

	{#if docView}
		<div
			in:fly={{ x: 28, duration: 220, opacity: 0.2 }}
			out:fly={{ x: -20, duration: 160, opacity: 0 }}
		>
			<EditDocumentChunks {handledocView} {currentDocView} {currentDocument} />
		</div>
	{:else}
		<div
			in:fly={{ x: -28, duration: 220, opacity: 0.2 }}
			out:fly={{ x: 20, duration: 160, opacity: 0 }}
		>
			<div class="mt-8 space-y-5">
				<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div class="space-y-0.5">
						<h1 class="font-semibold text-2xl">My Documents</h1>
						<p class="text-base-content/70 text-sm">
							{totalDocs} {totalDocs === 1 ? 'item' : 'items'} in your library
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<button class="btn btn-primary btn-sm" onclick={openAddModal}><Plus size={16} /> Add Document</button>
					</div>
				</div>

				<div>
					<label class="input input-bordered input-sm flex items-center gap-2 max-w-md">
						<Search size={14} class="text-base-content/60" />
						<input
							type="text"
							class="grow text-sm"
							placeholder="Search documents..."
							bind:value={searchTerm}
						/>
					</label>
				</div>

				{#if userContentLib.isLoading}
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
						{#each Array(10) as _}
							<div class="card aspect-[8.5/11] bg-base-100 border border-base-300 rounded-lg">
								<div class="card-body p-4 space-y-3">
									<div class="skeleton h-4 w-3/4"></div>
									<div class="skeleton h-3 w-full"></div>
									<div class="skeleton h-3 w-4/5"></div>
									<div class="mt-auto">
										<div class="skeleton h-3 w-1/2"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else if userContentLib.error}
					<div class="alert alert-error">
						<span>Unable to load your library right now.</span>
					</div>
				{:else if !userContentLib.data || userContentLib.data.length === 0}
					<div class="rounded-lg border-2 border-dashed border-base-300 bg-base-100 p-12 text-center space-y-4">
						<div class="flex items-center justify-center">
							<div class="p-3 rounded-full bg-primary/10">
								<File size={24} class="text-primary" />
							</div>
						</div>
						<div class="space-y-1">
							<p class="text-lg font-semibold">No documents yet</p>
							<p class="text-sm text-base-content/70 max-w-md mx-auto">
								Start building your library by uploading your first document
							</p>
						</div>
						<button class="btn btn-primary btn-sm" onclick={openAddModal}><Plus size={16} /> Add your first document</button>
					</div>
				{:else if filteredDocs.length === 0}
					<div class="rounded-lg border border-base-300 bg-base-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
						<div>
							<p class="font-semibold">No matching documents</p>
							<p class="text-sm text-base-content/70">Try adjusting your search terms</p>
						</div>
						<button class="btn btn-ghost btn-sm" type="button" onclick={() => {
							searchTerm = '';
						}}>Clear search</button>
					</div>
				{:else}
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
						{#each filteredDocs as doc (doc._id)}
							<div
								class="group card relative aspect-[8.5/11] bg-linear-to-br from-primary/5 via-base-100 to-secondary/5 border border-base-300 shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer rounded-lg overflow-hidden"
								onclick={() => handledocView(doc._id, doc)}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										handledocView(doc._id, doc);
									}
								}}
								tabindex="0"
								role="button"
							>
								<div class="absolute inset-0 pointer-events-none rounded-lg border border-white/10"></div>
								<div class="card-body p-4 space-y-3">
									<div class="flex items-start justify-between gap-2">
										<div class="flex-1 min-w-0 space-y-1.5">
											<div class="flex items-center gap-1.5 text-base-content">
												<File size={14} class="shrink-0" />
												<span class="text-base font-semibold leading-tight truncate">{doc.title}</span>
											</div>
											<p class="text-xs text-base-content/70 line-clamp-2">
												{doc.description ? doc.description : 'No description'}
											</p>
										</div>
										<div class="dropdown dropdown-end shrink-0">
											<button
												class="btn btn-ghost btn-circle btn-xs opacity-60 group-hover:opacity-100 transition-opacity"
												aria-haspopup="menu"
												aria-label="Open menu"
												onclick={(event) => event.stopPropagation()}
											>
												<MoreVertical size={14} />
											</button>
											<ul role="menu" class="dropdown-content menu bg-base-100 rounded-box w-40 p-1.5 shadow-lg border border-base-300 z-10">
												<li>
													<button
														class="btn btn-xs btn-ghost w-full justify-start"
														type="button"
														onclick={(event) => {
															event.stopPropagation();
															editDocument(doc);
														}}
													>
														<Pencil size={14} />
														Edit
													</button>
												</li>
												<li>
													<button
														class="btn btn-xs btn-ghost text-error w-full justify-start"
														type="button"
														onclick={(event) => {
															event.stopPropagation();
															openDeleteModal(doc);
														}}
														disabled={isDeleting}
													>
														<Trash2 size={14} />
														Delete
													</button>
												</li>
											</ul>
										</div>
									</div>

									<div class="mt-auto pt-2 border-t border-base-300/50">
										<div class="flex items-center gap-1.5 text-xs text-base-content/60">
											<Clock3 size={12} />
											<span class="truncate">{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'No date'}</span>
										</div>
									</div>

									<div class="text-[10px] uppercase tracking-wider text-base-content/50 font-medium">Click to open</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<AddDocumentModal {isAddModalOpen} {closeAddModal} userData={userDataQuery.data} />

		<EditDocumentModal {isEditModalOpen} {closeEditModal} {editingDocument} userData={userDataQuery.data} />

		<DeleteConfirmationModal
			{isDeleteModalOpen}
			onCancel={closeDeleteModal}
			onConfirm={handleDelete}
			itemName={deletingDocument?.title}
			itemType="document"
		/>
	{/if}
</div>
