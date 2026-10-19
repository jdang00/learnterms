import { buttonVariants } from '$lib/components/ui/button';
import { cn } from '$lib/utils.js';

// The setup sentence's pickers use the same rounded chips as the rest of admin.
// Unfilled chips are dashed so they read as blanks to fill in.
export function tokenClass(filled: boolean) {
	return cn(
		buttonVariants({ variant: filled ? 'soft' : 'dash', tone: 'neutral' }),
		'mx-1.5 max-w-full gap-2 px-5 align-middle text-base font-medium',
		!filled && 'text-foreground/55'
	);
}
