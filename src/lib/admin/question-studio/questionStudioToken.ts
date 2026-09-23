// The setup sentence's pickers use the same rounded chips as the rest of admin.
// Unfilled chips are dashed so they read as blanks to fill in.
export function tokenClass(filled: boolean) {
	return [
		'btn mx-1.5 max-w-full gap-2 rounded-full px-5 align-middle text-base font-medium',
		filled ? '' : 'border-dashed border-base-300 text-base-content/55'
	].join(' ');
}
