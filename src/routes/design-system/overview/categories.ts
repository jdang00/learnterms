// Overview categories, in page order. The sidebar and the page both read this list.
export const categories = [
	{ id: 'foundations', title: 'Foundations' },
	{ id: 'actions', title: 'Actions' },
	{ id: 'inputs', title: 'Inputs and pickers' },
	{ id: 'overlays', title: 'Overlays' },
	{ id: 'feedback', title: 'Feedback and loading' },
	{ id: 'data', title: 'Data display' },
	{ id: 'study', title: 'Study and progress' }
] as const;

export type CategoryId = (typeof categories)[number]['id'];
