/** Fades and lifts an element (or its children, staggered) into view when it scrolls on screen. */
export function reveal(node: HTMLElement, opts?: { y?: number; delay?: number; stagger?: number }) {
	const y = opts?.y ?? 24;
	const delay = opts?.delay ?? 0;
	const stagger = opts?.stagger ?? 0;
	const reduceMotion =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	const children = stagger ? (Array.from(node.children) as HTMLElement[]) : [];
	const targets = stagger ? children : [node];

	targets.forEach((el, i) => {
		if (reduceMotion) {
			el.style.opacity = '1';
			el.style.transform = 'translateY(0)';
			el.style.transition = '';
			return;
		}
		el.style.opacity = '0';
		el.style.transform = `translateY(${y}px)`;
		el.style.transition = `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay + i * stagger}ms`;
	});

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
				if (reduceMotion) {
					targets.forEach((el) => {
						el.style.opacity = '1';
						el.style.transform = 'translateY(0)';
					});
					observer.disconnect();
					return;
				}
				targets.forEach((el, i) => {
					setTimeout(
						() => {
							el.style.opacity = '1';
							el.style.transform = 'translateY(0)';
						},
						delay + i * stagger
					);
				});
				observer.disconnect();
			}
		},
		{ threshold: 0.15 }
	);
	observer.observe(node);

	return { destroy: () => observer.disconnect() };
}
