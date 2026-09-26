// Native popovers render in the top layer, so scroll containers can't clip them.
// These helpers pin one to the button that opened it: right-aligned, below, or above when
// there's no room below, and kept in place while the page scrolls.

export function placePopover(popover: HTMLElement, anchor: HTMLElement, gap = 6, margin = 8) {
	const target = anchor.getBoundingClientRect();
	const { width, height } = popover.getBoundingClientRect();
	const left = Math.min(Math.max(margin, target.right - width), window.innerWidth - width - margin);
	const below = target.bottom + gap;
	const top =
		below + height <= window.innerHeight - margin
			? below
			: Math.max(margin, target.top - height - gap);
	popover.style.left = `${left}px`;
	popover.style.top = `${top}px`;
}

export function followAnchor(popover: HTMLElement, anchor: HTMLElement) {
	const place = () => placePopover(popover, anchor);
	place();
	window.addEventListener('scroll', place, true);
	window.addEventListener('resize', place);
	return () => {
		window.removeEventListener('scroll', place, true);
		window.removeEventListener('resize', place);
	};
}
