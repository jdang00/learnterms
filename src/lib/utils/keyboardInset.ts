// Publishes the on-screen keyboard's height as --keyboard-inset so fixed bottom bars can sit above it.
export function trackKeyboardInset(): () => void {
	const viewport = window.visualViewport;
	if (!viewport) return () => {};
	const root = document.documentElement;
	let frame = 0;

	const update = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			// Pinch zoom also shrinks the visual viewport; only a keyboard does it at scale 1.
			const covered =
				viewport.scale > 1.01 ? 0 : window.innerHeight - viewport.height - viewport.offsetTop;
			const inset = covered > 80 ? Math.round(covered) : 0;
			root.style.setProperty('--keyboard-inset', `${inset}px`);
			root.toggleAttribute('data-keyboard-open', inset > 0);
		});
	};

	update();
	viewport.addEventListener('resize', update);
	viewport.addEventListener('scroll', update);
	return () => {
		cancelAnimationFrame(frame);
		viewport.removeEventListener('resize', update);
		viewport.removeEventListener('scroll', update);
		root.style.removeProperty('--keyboard-inset');
		root.removeAttribute('data-keyboard-open');
	};
}
