import type { Action } from 'svelte/action';

export type SheetDragHandlers = {
	// Positive dy is downward, in px from where the drag started.
	onmove: (dy: number) => void;
	// velocity is px/ms at release; a release with no movement arrives as a tap (dy 0).
	onend: (dy: number, velocity: number) => void;
	enabled?: () => boolean;
};

// Vertical drag on a sheet handle. Controls inside the handle keep their own taps.
export const sheetDrag: Action<HTMLElement, SheetDragHandlers> = (node, initial) => {
	let handlers = initial;
	let pointerId: number | null = null;
	let startY = 0;
	let lastY = 0;
	let lastTime = 0;
	let velocity = 0;

	function down(event: PointerEvent) {
		if (event.button !== 0 || handlers.enabled?.() === false) return;
		if ((event.target as Element).closest('button, a, input, textarea, select, [contenteditable]'))
			return;
		pointerId = event.pointerId;
		startY = lastY = event.clientY;
		lastTime = event.timeStamp;
		velocity = 0;
		node.setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		if (event.pointerId !== pointerId) return;
		const elapsed = event.timeStamp - lastTime;
		if (elapsed > 0) velocity = (event.clientY - lastY) / elapsed;
		lastY = event.clientY;
		lastTime = event.timeStamp;
		handlers.onmove(event.clientY - startY);
	}

	function up(event: PointerEvent) {
		if (event.pointerId !== pointerId) return;
		pointerId = null;
		// A pause before letting go shouldn't count as a flick.
		const settled = event.timeStamp - lastTime > 80;
		handlers.onend(event.clientY - startY, settled ? 0 : velocity);
	}

	function cancel(event: PointerEvent) {
		if (event.pointerId !== pointerId) return;
		pointerId = null;
		handlers.onend(0, 0);
	}

	node.style.touchAction = 'none';
	node.addEventListener('pointerdown', down);
	node.addEventListener('pointermove', move);
	node.addEventListener('pointerup', up);
	node.addEventListener('pointercancel', cancel);

	return {
		update(next) {
			handlers = next;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', cancel);
		}
	};
};
