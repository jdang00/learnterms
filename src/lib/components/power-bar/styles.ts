// Shared looks for PowerBar rows. Command marks the highlighted row with data-selected,
// so hover and arrow-key focus read the same.
export const POWER_ITEM_CLASS =
	'group flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2.5 text-left outline-hidden transition-colors duration-100 data-selected:bg-muted/60 data-disabled:pointer-events-none data-disabled:opacity-50';

export const POWER_HEADING_CLASS =
	'px-3 pt-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-foreground/35';

export const POWER_NOTE_CLASS = 'px-3 py-2 text-sm text-foreground/45';
